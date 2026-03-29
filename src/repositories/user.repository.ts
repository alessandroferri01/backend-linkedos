import { prisma } from '../models';

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByStripeCustomerId(stripeCustomerId: string) {
    return prisma.user.findUnique({ where: { stripeCustomerId } });
  },

  async create(data: { email: string; passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        profile: { create: {} },
      },
      include: { profile: true },
    });
  },

  async updateCredits(userId: string, credits: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { creditsRemaining: credits },
    });
  },

  async decrementCredits(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { creditsRemaining: { decrement: 1 } },
    });
  },

  async updateSubscription(
    userId: string,
    data: { subscriptionStatus: 'FREE' | 'ACTIVE' | 'CANCELLED' | 'PAST_DUE'; creditsRemaining?: number },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  async setStripeCustomerId(userId: string, stripeCustomerId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  },
};
