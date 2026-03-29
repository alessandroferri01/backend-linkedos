import { prisma } from '../models';

export const postRepository = {
  async findByUserId(userId: string) {
    return prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.post.findUnique({ where: { id } });
  },

  async create(data: { userId: string; topic: string; generatedContent: string }) {
    return prisma.post.create({ data });
  },

  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  },
};
