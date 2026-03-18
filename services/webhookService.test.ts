import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { enqueueEventForUser, attemptDelivery, HttpClient } from "./webhookService.js";

const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    webhookSubscription: {
      findMany: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: vi.fn().mockImplementation(function () {
      return mockPrisma;
    }),
  };
});

describe("webhookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enqueueEventForUser", () => {
    it("creates deliveries for each active subscription", async () => {
      mockPrisma.webhookSubscription.findMany.mockResolvedValue([
        { id: "s1", userId: "u1", eventType: "transaction.created", active: true },
        { id: "s2", userId: "u1", eventType: "transaction.created", active: true },
      ]);

      mockPrisma.webhookDelivery.create.mockResolvedValue({});

      await enqueueEventForUser("u1", "transaction.created", { foo: "bar" });

      expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("attemptDelivery", () => {
    it("marks delivery as SUCCESS on 2xx", async () => {
      const payload = { foo: "bar" };

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        id: "d1",
        subscriptionId: "s1",
        eventType: "transaction.created",
        payload,
        status: "PENDING",
        attempts: 0,
        completedAt: null,
        subscription: {
          id: "s1",
          url: "https://example.com/webhook",
          secret: "secret",
        },
      });

      const httpClient: HttpClient = {
        post: vi.fn().mockResolvedValue({ status: 200 }),
      };

      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: "d1",
        status: "SUCCESS",
        attempts: 1,
      });

      const updated = await attemptDelivery("d1", httpClient);

      expect(httpClient.post).toHaveBeenCalled();
      expect(updated).toEqual(expect.objectContaining({ status: "SUCCESS", attempts: 1 }));
    });

    it("schedules retry on non-2xx", async () => {
      const payload = { foo: "bar" };

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        id: "d2",
        subscriptionId: "s1",
        eventType: "transaction.created",
        payload,
        status: "PENDING",
        attempts: 1,
        completedAt: null,
        subscription: {
          id: "s1",
          url: "https://example.com/webhook",
          secret: "secret",
        },
      });

      const httpClient: HttpClient = {
        post: vi.fn().mockResolvedValue({ status: 500 }),
      };

      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: "d2",
        status: "PENDING",
        attempts: 2,
        nextAttemptAt: new Date(),
      });

      const updated = await attemptDelivery("d2", httpClient);

      expect(httpClient.post).toHaveBeenCalled();
      expect(updated).toEqual(
        expect.objectContaining({
          status: "PENDING",
          attempts: 2,
        })
      );
    });
  });
});

