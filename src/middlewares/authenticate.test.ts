import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate } from './authenticate';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../config', () => ({
  ENV: {
    JWT_SECRET: 'test-secret-key-for-tests',
  },
}));

function createMockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function createMockRes(): Response {
  return {} as Response;
}

describe('authenticate middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should call next with UnauthorizedError if no authorization header', () => {
    const req = createMockReq();

    authenticate(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing or invalid authorization header' }),
    );
  });

  it('should call next with UnauthorizedError if header does not start with Bearer', () => {
    const req = createMockReq({ authorization: 'Basic abc123' });

    authenticate(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing or invalid authorization header' }),
    );
  });

  it('should call next with UnauthorizedError for invalid token', () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token.here' });

    authenticate(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or expired token' }),
    );
  });

  it('should attach user to request and call next() for valid token', () => {
    const payload = { userId: 'user-1', email: 'test@example.com' };
    const token = jwt.sign(payload, 'test-secret-key-for-tests', { expiresIn: '1h' });
    const req = createMockReq({ authorization: `Bearer ${token}` });

    authenticate(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-1');
    expect(req.user!.email).toBe('test@example.com');
  });

  it('should reject expired tokens', () => {
    const payload = { userId: 'user-1', email: 'test@example.com' };
    const token = jwt.sign(payload, 'test-secret-key-for-tests', { expiresIn: '-1s' });
    const req = createMockReq({ authorization: `Bearer ${token}` });

    authenticate(req, createMockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or expired token' }),
    );
  });
});
