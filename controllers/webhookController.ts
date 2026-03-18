import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import crypto from "crypto";

const prisma = new PrismaClient();

interface CreateSubscriptionBody {
  url: string;
  eventType: string;
  secret?: string;
}

export const createSubscription = async (
  req: AuthenticatedRequest & { body: CreateSubscriptionBody },
  res: Response
): Promise<void> => {
  const { url, eventType, secret } = req.body;

  if (!url) {
    res.status(400).json({ message: ERROR_MESSAGES.WEBHOOK_URL_REQUIRED });
    return;
  }

  if (!eventType) {
    res.status(400).json({ message: ERROR_MESSAGES.WEBHOOK_EVENT_REQUIRED });
    return;
  }

  const generatedSecret = secret || crypto.randomBytes(16).toString("hex");

  try {
    const sub = await prisma.webhookSubscription.create({
      data: {
        userId: req.user!.userId,
        url,
        eventType,
        secret: generatedSecret,
        active: true,
      },
    });

    res.status(201).json({
      message: SUCCESS_MESSAGES.WEBHOOK_SUBSCRIBED,
      subscription: {
        id: sub.id,
        url: sub.url,
        eventType: sub.eventType,
        active: sub.active,
        createdAt: sub.createdAt,
        // only return secret at creation time
        secret: generatedSecret,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({ message: ERROR_MESSAGES.UNKNOWN_ERROR, error: message });
  }
};

export const listSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const where =
      req.user!.role === "ADMIN"
        ? {}
        : {
            userId: req.user!.userId,
          };

    const subs = await prisma.webhookSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(
      subs.map((s) => ({
        id: s.id,
        url: s.url,
        eventType: s.eventType,
        active: s.active,
        createdAt: s.createdAt,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({ message: ERROR_MESSAGES.UNKNOWN_ERROR, error: message });
  }
};

export const listDeliveries = async (
  req: AuthenticatedRequest & { query: { subscriptionId?: string } },
  res: Response
): Promise<void> => {
  const { subscriptionId } = req.query;

  try {
    const baseWhere: any = {};
    if (subscriptionId) {
      baseWhere.subscriptionId = subscriptionId;
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: baseWhere,
      include: {
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = deliveries.filter((d) => {
      if (req.user!.role === "ADMIN") return true;
      return d.subscription.userId === req.user!.userId;
    });

    res.status(200).json(
      filtered.map((d) => ({
        id: d.id,
        subscriptionId: d.subscriptionId,
        eventType: d.eventType,
        status: d.status,
        attempts: d.attempts,
        responseStatus: d.responseStatus,
        errorMessage: d.errorMessage,
        nextAttemptAt: d.nextAttemptAt,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({ message: ERROR_MESSAGES.UNKNOWN_ERROR, error: message });
  }
};

