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

vi.mock('../services/webhookService.js', () => ({
  enqueueEventForUser: vi.fn().mockResolvedValue(undefined),
}));

describe('Wallet Controller Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupWallet', () => {
    it('should initialize a wallet with the correct balance', async () => {
      const req = {
        body: { name: 'Savings', balance: 500 },
        user: { userId: 'user-1', role: 'USER' },
      } as any;
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
      const req = {
        params: { walletId: 'w1' },
        body: { amount: 100, description: 'Bonus' },
        user: { userId: 'user-1', role: 'USER' },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', balance: 500, userId: 'user-1' });
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

    it('should forbid transaction for non-owner non-admin', async () => {
      const req = {
        params: { walletId: 'w1' },
        body: { amount: 50, description: 'Test' },
        user: { userId: 'user-2', role: 'USER' },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', balance: 500, userId: 'user-1' });

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: ERROR_MESSAGES.FORBIDDEN }));
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
    });

    it('should allow admin to transact on any wallet', async () => {
      const req = {
        params: { walletId: 'w1' },
        body: { amount: 100, description: 'Admin credit' },
        user: { userId: 'admin-1', role: 'ADMIN' },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', balance: 500, userId: 'user-1' });
      mockPrisma.wallet.update.mockResolvedValue({ id: 'w1', balance: 600 });
      mockPrisma.transaction.create.mockResolvedValue({ id: 't3' });

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ balance: '600.0000' }));
    });
  });

  describe('getWallet', () => {
    it('should return wallet for owner', async () => {
      const req = {
        params: { id: 'w1' },
        user: { userId: 'user-1', role: 'USER' },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        name: 'Savings',
        balance: 500,
        date: new Date(),
        userId: 'user-1',
      });

      await getWallet(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1', balance: '500.0000' }));
    });

    it('should forbid non-owner non-admin', async () => {
      const req = {
        params: { id: 'w1' },
        user: { userId: 'user-2', role: 'USER' },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        name: 'Savings',
        balance: 500,
        date: new Date(),
        userId: 'user-1',
      });

      await getWallet(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: ERROR_MESSAGES.FORBIDDEN }));
    });

    it('should allow admin to view any wallet', async () => {
      const req = {
        params: { id: 'w1' },
        user: { userId: 'admin-1', role: 'ADMIN' },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        name: 'Savings',
        balance: 500,
        date: new Date(),
        userId: 'user-1',
      });

      await getWallet(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1', balance: '500.0000' }));
    });
  });
});
