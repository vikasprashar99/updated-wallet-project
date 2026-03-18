import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupWallet, createTransaction, getWallet } from './walletController.js';
import { ERROR_MESSAGES } from '../constants.js';

// Centralized mock for Prisma to be used across tests
const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    wallet: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((callback) => callback(mock));
  return { mockPrisma: mock };
});

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(function() {
      return mockPrisma;
    })
  };
});

describe('Wallet Controller Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupWallet', () => {
    it('should initialize a wallet with the correct balance', async () => {
      const req = { body: { name: 'Savings', balance: 500 } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.create.mockResolvedValue({ id: 'w1', name: 'Savings', balance: 500, date: new Date() });
      mockPrisma.transaction.create.mockResolvedValue({ id: 't1' });

      await setupWallet(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Savings', balance: '500.0000' }));
    });
  });

  describe('createTransaction', () => {
    it('should update balance correctly for a credit', async () => {
      const req = { params: { walletId: 'w1' }, body: { amount: 100, description: 'Bonus' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', balance: 500 });
      mockPrisma.wallet.update.mockResolvedValue({ id: 'w1', balance: 600 });
      mockPrisma.transaction.create.mockResolvedValue({ id: 't2' });

      await createTransaction(req, res);

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { balance: { increment: 100 } }
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ balance: '600.0000' }));
    });

    it('should return error if wallet does not exist', async () => {
      const req = { params: { walletId: 'invalid' }, body: { amount: 10, description: 'Test' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: ERROR_MESSAGES.TRANSACTION_FAILED }));
    });
  });
});
