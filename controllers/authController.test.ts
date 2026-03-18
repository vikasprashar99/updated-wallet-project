import { describe, it, expect, vi, beforeEach } from "vitest";
import { register, login } from "./authController.js";
import { ERROR_MESSAGES, ROLES, SUCCESS_MESSAGES } from "../constants.js";

const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn((plain: string, hashed: string) =>
      Promise.resolve(plain === "password123" && hashed === "hashed-password")
    ),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("test-jwt-token"),
  },
}));

describe("Auth Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user and return a token", async () => {
      const req = {
        body: { email: "user@example.com", password: "password123" },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "u1",
        email: "user@example.com",
        role: ROLES.USER,
      });

      await register(req, res);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SUCCESS_MESSAGES.REGISTER_SUCCESS,
          token: "test-jwt-token",
          user: expect.objectContaining({
            id: "u1",
            email: "user@example.com",
            role: ROLES.USER,
          }),
        })
      );
    });

    it("should return 400 if email already exists", async () => {
      const req = {
        body: { email: "user@example.com", password: "password123" },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "user@example.com",
        role: ROLES.USER,
      });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: ERROR_MESSAGES.EMAIL_IN_USE })
      );
    });
  });

  describe("login", () => {
    it("should login a user with valid credentials", async () => {
      const req = {
        body: { email: "user@example.com", password: "password123" },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "user@example.com",
        password: "hashed-password",
        role: ROLES.USER,
      });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
          token: "test-jwt-token",
          user: expect.objectContaining({
            id: "u1",
            email: "user@example.com",
            role: ROLES.USER,
          }),
        })
      );
    });

    it("should return 401 for invalid credentials", async () => {
      const req = {
        body: { email: "user@example.com", password: "wrong" },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: ERROR_MESSAGES.INVALID_CREDENTIALS })
      );
    });
  });
});

