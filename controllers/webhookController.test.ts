import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSubscription, listSubscriptions, listDeliveries } from "./webhookController.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants.js";

const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    webhookSubscription: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    webhookDelivery: {
      findMany: vi.fn(),
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

describe("Webhook Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSubscription", () => {
    it("validates required fields", async () => {
      const req = {
        body: { url: "", eventType: "" },
        user: { userId: "u1", role: "USER" },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: ERROR_MESSAGES.WEBHOOK_URL_REQUIRED })
      );
    });

    it("creates a subscription and returns secret", async () => {
      const req = {
        body: { url: "https://example.com/webhook", eventType: "transaction.created" },
        user: { userId: "u1", role: "USER" },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.webhookSubscription.create.mockResolvedValue({
        id: "s1",
        userId: "u1",
        url: "https://example.com/webhook",
        eventType: "transaction.created",
        active: true,
        createdAt: new Date(),
        secret: "generated",
      });

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SUCCESS_MESSAGES.WEBHOOK_SUBSCRIBED,
          subscription: expect.objectContaining({
            id: "s1",
            url: "https://example.com/webhook",
            eventType: "transaction.created",
          }),
        })
      );
    });
  });

  describe("listSubscriptions", () => {
    it("lists only current user's subscriptions for non-admin", async () => {
      const req = {
        user: { userId: "u1", role: "USER" },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.webhookSubscription.findMany.mockResolvedValue([
        {
          id: "s1",
          userId: "u1",
          url: "https://example.com/a",
          eventType: "transaction.created",
          active: true,
          createdAt: new Date(),
        },
      ]);

      await listSubscriptions(req, res);

      expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "s1",
          }),
        ])
      );
    });
  });

  describe("listDeliveries", () => {
    it("returns deliveries only for current user's subscriptions when non-admin", async () => {
      const req = {
        query: {},
        user: { userId: "u1", role: "USER" },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.webhookDelivery.findMany.mockResolvedValue([
        {
          id: "d1",
          subscriptionId: "s1",
          eventType: "transaction.created",
          status: "PENDING",
          attempts: 0,
          responseStatus: null,
          errorMessage: null,
          nextAttemptAt: null,
          createdAt: new Date(),
          completedAt: null,
          subscription: {
            id: "s1",
            userId: "u1",
          },
        },
        {
          id: "d2",
          subscriptionId: "s2",
          eventType: "transaction.created",
          status: "PENDING",
          attempts: 0,
          responseStatus: null,
          errorMessage: null,
          nextAttemptAt: null,
          createdAt: new Date(),
          completedAt: null,
          subscription: {
            id: "s2",
            userId: "other-user",
          },
        },
      ]);

      await listDeliveries(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as any).mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].id).toBe("d1");
    });
  });
});

