import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { ENV } from '../config';
import { userRepository, profileRepository } from '../repositories';
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
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
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
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        subscriptionStatus: user.subscriptionStatus,
        creditsRemaining: user.creditsRemaining,
      },
      token,
    };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      subscriptionStatus: user.subscriptionStatus,
      creditsRemaining: user.creditsRemaining,
    };
  },

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ) {
    const user = await userRepository.updateProfile(userId, data);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      subscriptionStatus: user.subscriptionStatus,
      creditsRemaining: user.creditsRemaining,
    };
  },

  async getAIProfile(userId: string) {
    const profile = await profileRepository.findByUserId(userId);
    return {
      profession: profile?.profession ?? null,
      tone: profile?.tone ?? null,
      targetAudience: profile?.targetAudience ?? null,
      writingStyle: profile?.writingStyle ?? null,
    };
  },

  async updateAIProfile(
    userId: string,
    data: { profession?: string; tone?: string; targetAudience?: string; writingStyle?: string },
  ) {
    const profile = await profileRepository.update(userId, data);
    return {
      profession: profile.profession,
      tone: profile.tone,
      targetAudience: profile.targetAudience,
      writingStyle: profile.writingStyle,
    };
  },
};
