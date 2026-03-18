import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  TRANSACTION_TYPES,
  DEFAULT_SETUP_DESCRIPTION,
  PAGINATION_DEFAULTS,
  ERROR_MESSAGES,
} from "../constants.js";

const prisma = new PrismaClient();

const toDecimalString = (num: number): string => {
  return num.toFixed(4);
};

interface SetupWalletBody {
  name: string;
  balance: number;
}

interface CreateTransactionBody {
  amount: number;
  description: string;
}

interface GetTransactionsQuery {
  walletId?: string;
  skip?: string;
  limit?: string;
  sortBy?: string;
  order?: string;
}

export const setupWallet = async (
  req: Request<object, object, SetupWalletBody>,
  res: Response
): Promise<void> => {
  const { name, balance } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.create({
        data: { name, balance },
      });

      const firstTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: balance,
          balance: wallet.balance,
          description: DEFAULT_SETUP_DESCRIPTION,
          type: TRANSACTION_TYPES.CREDIT,
        },
      });

      return { wallet, firstTransaction };
    });

    res.status(200).json({
      id: result.wallet.id,
      balance: toDecimalString(result.wallet.balance),
      transactionId: result.firstTransaction.id,
      name: result.wallet.name,
      date: result.wallet.date,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({
      message: ERROR_MESSAGES.WALLET_SETUP_FAILED,
      error: errorMessage,
    });
  }
};

export const createTransaction = async (
  req: Request<{ walletId: string }, object, CreateTransactionBody>,
  res: Response
): Promise<void> => {
  const { walletId } = req.params;
  const { amount, description } = req.body;

  if (amount == null || isNaN(parseFloat(String(amount)))) {
    res.status(400).json({ message: ERROR_MESSAGES.VALID_AMOUNT_REQUIRED });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_FOUND);
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: { increment: amount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId,
          amount: Math.abs(amount),
          balance: updatedWallet.balance,
          description,
          type: amount > 0 ? TRANSACTION_TYPES.CREDIT : TRANSACTION_TYPES.DEBIT,
        },
      });

      return { updatedWallet, transaction };
    });

    res.status(200).json({
      balance: toDecimalString(result.updatedWallet.balance),
      transactionId: result.transaction.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    const statusCode = errorMessage === ERROR_MESSAGES.WALLET_NOT_FOUND ? 404 : 500;
    res.status(statusCode).json({
      message: ERROR_MESSAGES.TRANSACTION_FAILED,
      error: errorMessage,
    });
  }
};

export const getTransactions = async (
  req: Request<object, object, object, GetTransactionsQuery>,
  res: Response
): Promise<void> => {
  const {
    walletId,
    skip = String(PAGINATION_DEFAULTS.skip),
    limit = String(PAGINATION_DEFAULTS.limit),
    sortBy = PAGINATION_DEFAULTS.sortBy,
    order = PAGINATION_DEFAULTS.order,
  } = req.query;

  if (!walletId) {
    res.status(400).json({ message: ERROR_MESSAGES.WALLET_ID_REQUIRED });
    return;
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { walletId },
      orderBy: { [sortBy]: order },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      walletId: tx.walletId,
      amount: toDecimalString(tx.amount),
      balance: toDecimalString(tx.balance),
      description: tx.description,
      date: tx.date,
      type: tx.type,
    }));

    res.status(200).json(formattedTransactions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({
      message: ERROR_MESSAGES.FETCH_TRANSACTIONS_FAILED,
      error: errorMessage,
    });
  }
};

export const getWallet = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      res.status(404).json({ message: ERROR_MESSAGES.WALLET_NOT_FOUND });
      return;
    }

    res.status(200).json({
      id: wallet.id,
      balance: toDecimalString(wallet.balance),
      name: wallet.name,
      date: wallet.date,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    res.status(500).json({
      message: ERROR_MESSAGES.FETCH_WALLET_FAILED,
      error: errorMessage,
    });
  }
};
