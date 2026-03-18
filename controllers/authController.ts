import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AUTH_CONFIG, ERROR_MESSAGES, ROLES, SUCCESS_MESSAGES } from "../constants.js";
import { AuthPayload } from "../middleware/auth.js";

const prisma = new PrismaClient();

interface RegisterBody {
  email: string;
  password: string;
  role?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

const signToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, AUTH_CONFIG.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN,
  });
};

export const register = async (
  req: Request<object, object, RegisterBody>,
  res: Response
): Promise<void> => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ message: ERROR_MESSAGES.EMAIL_IN_USE });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: role === ROLES.ADMIN ? "ADMIN" : "USER",
      },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.status(201).json({
      message: SUCCESS_MESSAGES.REGISTER_SUCCESS,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({ message: ERROR_MESSAGES.UNKNOWN_ERROR, error: message });
  }
};

export const login = async (
  req: Request<object, object, LoginBody>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.status(200).json({
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({ message: ERROR_MESSAGES.UNKNOWN_ERROR, error: message });
  }
};

