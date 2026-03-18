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
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SERVER_STARTED: (port: number, db: string) => `Server is running on port ${port} with ${db} database`,
} as const;
