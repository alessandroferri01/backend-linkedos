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

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  async findByLinkedinId(linkedinId: string) {
    return prisma.user.findUnique({ where: { linkedinId } });
  },

  async updateLinkedin(
    userId: string,
    data: {
      linkedinId?: string | null;
      linkedinAccessToken?: string | null;
      linkedinRefreshToken?: string | null;
      linkedinTokenExpiresAt?: Date | null;
      linkedinConnected: boolean;
    },
  ) {
    const updateData: Record<string, unknown> = { linkedinConnected: data.linkedinConnected };
    if (data.linkedinId !== undefined) updateData.linkedinId = data.linkedinId;
    if (data.linkedinAccessToken !== undefined) updateData.linkedinAccessToken = data.linkedinAccessToken;
    if (data.linkedinRefreshToken !== undefined) updateData.linkedinRefreshToken = data.linkedinRefreshToken;
    if (data.linkedinTokenExpiresAt !== undefined) updateData.linkedinTokenExpiresAt = data.linkedinTokenExpiresAt;

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  },
};
