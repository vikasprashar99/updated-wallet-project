// Server Configuration
export const PORT = process.env.PORT || 3000;

// Transaction Types
export const TRANSACTION_TYPES = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

// Default Transaction Description
export const DEFAULT_SETUP_DESCRIPTION = "Setup";

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  skip: 0,
  limit: 10,
  sortBy: "date",
  order: "desc",
} as const;

// Auth / Roles
export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: "1h",
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_WALLET_ID: "Invalid wallet ID.",
  WALLET_NOT_FOUND: "Wallet not found.",
  VALID_AMOUNT_REQUIRED: "A valid amount is required.",
  WALLET_ID_REQUIRED: "A valid walletId is required.",
  WALLET_SETUP_FAILED: "Failed to setup wallet",
  TRANSACTION_FAILED: "Transaction failed",
  FETCH_TRANSACTIONS_FAILED: "Failed to fetch transactions",
  FETCH_WALLET_FAILED: "Failed to fetch wallet",
  UNKNOWN_ERROR: "Unknown error",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_IN_USE: "Email is already in use",
  WEBHOOK_URL_REQUIRED: "Webhook URL is required",
  WEBHOOK_EVENT_REQUIRED: "Webhook eventType is required",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SERVER_STARTED: (port: number, db: string) => `Server is running on port ${port} with ${db} database`,
  REGISTER_SUCCESS: "Registration successful",
  LOGIN_SUCCESS: "Login successful",
  WEBHOOK_SUBSCRIBED: "Webhook subscribed",
} as const;

// Domain Events
export const EVENTS = {
  TRANSACTION_CREATED: "transaction.created",
  TRANSFER_COMPLETED: "transfer.completed",
} as const;
