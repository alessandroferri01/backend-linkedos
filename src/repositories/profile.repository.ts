import { prisma } from '../models';

export const profileRepository = {
  async findByUserId(userId: string) {
    return prisma.profile.findUnique({ where: { userId } });
  },

  async update(
    userId: string,
    data: {
      profession?: string;
      tone?: string;
      targetAudience?: string;
      writingStyle?: string;
    },
  ) {
    return prisma.profile.update({
      where: { userId },
      data,
    });
  },
};
