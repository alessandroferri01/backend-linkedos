import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';

const mockFindByEmail = vi.fn();
const mockCreate = vi.fn();

vi.mock('../repositories', () => ({
  userRepository: {
    findByEmail: (...args: unknown[]) => mockFindByEmail(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('../config', () => ({
  ENV: {
    JWT_SECRET: 'test-secret-key-for-tests',
    JWT_EXPIRES_IN: '7d',
  },
}));

const BASE_USER = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: '$2b$12$LJ3m4ys3Lk0TSwHjmz0VOeXhOZsB5sSvaFBKB.bA7p6e7fVHPEJi2', // "password123"
  role: 'USER' as const,
  subscriptionStatus: 'FREE' as const,
  creditsRemaining: 5,
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ ...BASE_USER });

      const result = await authService.register('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBe('user-1');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should throw ConflictError if email already exists', async () => {
      mockFindByEmail.mockResolvedValue(BASE_USER);

      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        'Email already registered',
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ ...BASE_USER });

      await authService.register('test@example.com', 'password123');

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('password123');
      expect(createCall.passwordHash).toMatch(/^\$2[aby]?\$/);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError if user not found', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(authService.login('no@user.com', 'password123')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedError if password is wrong', async () => {
      // Hash for "password123"
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('password123', 12);
      mockFindByEmail.mockResolvedValue({ ...BASE_USER, passwordHash: hash });

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should return user and token on valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('password123', 12);
      mockFindByEmail.mockResolvedValue({ ...BASE_USER, passwordHash: hash });

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });
  });
});
