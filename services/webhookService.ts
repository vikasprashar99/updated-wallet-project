import { PrismaClient, WebhookDelivery, WebhookSubscription } from "@prisma/client";
import crypto from "crypto";

export interface HttpClient {
  post: (
    url: string,
    options: { headers: Record<string, string>; body: string }
  ) => Promise<{ status: number }>;
}

const prisma = new PrismaClient();

const defaultHttpClient: HttpClient = {
  async post(url, { headers, body }) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });
    return { status: response.status };
  },
};

const computeSignature = (secret: string, payload: unknown): string => {
  const body = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
};

export const enqueueEventForUser = async (
  userId: string,
  eventType: string,
  payload: unknown
): Promise<void> => {
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      userId,
      eventType,
      active: true,
    },
  });

  await Promise.all(
    subscriptions.map((sub) =>
      prisma.webhookDelivery.create({
        data: {
          subscriptionId: sub.id,
          eventType,
          payload,
          status: "PENDING",
        },
      })
    )
  );
};

const computeBackoffSeconds = (attempts: number): number => {
  // simple exponential backoff in seconds: 2^attempts, capped at 300s
  const base = Math.pow(2, attempts);
  return Math.min(base, 300);
};

export const attemptDelivery = async (
  deliveryId: string,
  httpClient: HttpClient = defaultHttpClient
): Promise<WebhookDelivery | null> => {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { subscription: true },
  });

  if (!delivery || !delivery.subscription) {
    return null;
  }

  const { subscription } = delivery as WebhookDelivery & { subscription: WebhookSubscription };

  const body = JSON.stringify(delivery.payload);
  const signature = computeSignature(subscription.secret, delivery.payload);

  let statusCode: number | undefined;
  let errorMessage: string | undefined;
  let nextAttemptAt: Date | undefined;
  let status = delivery.status;

  try {
    const res = await httpClient.post(subscription.url, {
      headers: {
        "Content-Type": "application/json",
        "X-Wallet-Event": delivery.eventType,
        "X-Wallet-Signature": signature,
      },
      body,
    });

    statusCode = res.status;

    if (res.status >= 200 && res.status < 300) {
      status = "SUCCESS";
    } else {
      status = "PENDING";
      const nextSeconds = computeBackoffSeconds(delivery.attempts + 1);
      nextAttemptAt = new Date(Date.now() + nextSeconds * 1000);
      errorMessage = `HTTP ${res.status}`;
    }
  } catch (err) {
    statusCode = undefined;
    status = "PENDING";
    const nextSeconds = computeBackoffSeconds(delivery.attempts + 1);
    nextAttemptAt = new Date(Date.now() + nextSeconds * 1000);
    errorMessage = err instanceof Error ? err.message : "Unknown delivery error";
  }

  const updated = await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      attempts: delivery.attempts + 1,
      status,
      responseStatus: statusCode,
      nextAttemptAt: nextAttemptAt,
      errorMessage,
      completedAt: status === "SUCCESS" ? new Date() : delivery.completedAt,
    },
  });

  return updated;
};

