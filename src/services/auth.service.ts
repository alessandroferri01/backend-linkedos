import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { ENV } from '../config';
import { userRepository } from '../repositories';
import { ConflictError, UnauthorizedError } from '../utils';
import type { AuthPayload } from '../middlewares';

const SALT_ROUNDS = 12;

function generateToken(payload: AuthPayload): string {
  return jwt.sign(
    payload as object,
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as StringValue },
  );
}

export const authService = {
  async register(email: string, password: string) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already registered', 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({ email, passwordHash });

    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        creditsRemaining: user.creditsRemaining,
      },
      token,
    };
  },

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        creditsRemaining: user.creditsRemaining,
      },
      token,
    };
  },
};
