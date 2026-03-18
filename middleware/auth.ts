import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AUTH_CONFIG, ERROR_MESSAGES, ROLES, Role } from "../constants.js";

export interface AuthPayload {
  userId: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: ERROR_MESSAGES.UNAUTHORIZED });
    return;
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: ERROR_MESSAGES.UNAUTHORIZED });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    res.status(403).json({ message: ERROR_MESSAGES.FORBIDDEN });
    return;
  }
  next();
};

