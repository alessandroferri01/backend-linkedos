import { Request, Response, NextFunction } from 'express';
import { postService } from '../services';
import { sendSuccess } from '../utils';

export const postController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { topic, length } = req.body;
      const post = await postService.generate({
        userId: req.user!.userId,
        topic,
        length,
      });
      sendSuccess(res, post, 201);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const sortBy = (['createdAt', 'topic'] as const).includes(req.query.sortBy as 'createdAt' | 'topic')
        ? (req.query.sortBy as 'createdAt' | 'topic')
        : 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

      const result = await postService.getByUserId({
        userId: req.user!.userId,
        page,
        limit,
        sortBy,
        sortOrder,
        search: search || undefined,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const post = await postService.getById(id, req.user!.userId);
      sendSuccess(res, post);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      await postService.deletePost(id, req.user!.userId);
      sendSuccess(res, { message: 'Post deleted' });
    } catch (error) {
      next(error);
    }
  },
};
