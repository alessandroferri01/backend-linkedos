import { describe, it, expect, vi, beforeEach } from 'vitest';
import { creditService } from './credit.service';

const mockFindById = vi.fn();
const mockUpdateCredits = vi.fn();
const mockDecrementCredits = vi.fn();

vi.mock('../repositories', () => ({
  userRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    updateCredits: (...args: unknown[]) => mockUpdateCredits(...args),
    decrementCredits: (...args: unknown[]) => mockDecrementCredits(...args),
  },
}));

const BASE_USER = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  role: 'USER' as const,
  subscriptionStatus: 'FREE' as const,
  creditsRemaining: 5,
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('creditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCredits', () => {
    it('should return the user credits', async () => {
      mockFindById.mockResolvedValue({ ...BASE_USER, creditsRemaining: 3 });

      const credits = await creditService.checkCredits('user-1');

      expect(credits).toBe(3);
      expect(mockFindById).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(creditService.checkCredits('missing')).rejects.toThrow('User not found');
    });
  });

  describe('decrementCredits', () => {
    it('should decrement credits and return new count', async () => {
      mockFindById.mockResolvedValue({ ...BASE_USER, creditsRemaining: 3 });
      mockDecrementCredits.mockResolvedValue({ ...BASE_USER, creditsRemaining: 2 });

      const result = await creditService.decrementCredits('user-1');

      expect(result).toBe(2);
      expect(mockDecrementCredits).toHaveBeenCalledWith('user-1');
    });

    it('should throw BadRequestError if credits are 0', async () => {
      mockFindById.mockResolvedValue({ ...BASE_USER, creditsRemaining: 0 });

      await expect(creditService.decrementCredits('user-1')).rejects.toThrow(
        'No credits remaining',
      );
      expect(mockDecrementCredits).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(creditService.decrementCredits('missing')).rejects.toThrow('User not found');
    });
  });

  describe('resetMonthlyCredits', () => {
    it('should reset to 5 for FREE users', async () => {
      mockFindById.mockResolvedValue({ ...BASE_USER, subscriptionStatus: 'FREE' });

      await creditService.resetMonthlyCredits('user-1');

      expect(mockUpdateCredits).toHaveBeenCalledWith('user-1', 5);
    });

    it('should reset to 30 for ACTIVE users', async () => {
      mockFindById.mockResolvedValue({ ...BASE_USER, subscriptionStatus: 'ACTIVE' });

      await creditService.resetMonthlyCredits('user-1');

      expect(mockUpdateCredits).toHaveBeenCalledWith('user-1', 30);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(creditService.resetMonthlyCredits('missing')).rejects.toThrow(
        'User not found',
      );
    });
  });
});
