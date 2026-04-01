import { prisma } from '../models';

interface FindPostsOptions {
  userId: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'topic';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export const postRepository = {
  async findByUserId(options: FindPostsOptions) {
    const {
      userId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = options;

    const where: Record<string, unknown> = { userId };
    if (search) {
      where.OR = [
        { topic: { contains: search, mode: 'insensitive' } },
        { generatedContent: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
