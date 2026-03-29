import { Request, Response, NextFunction } from 'express';
import { postService } from '../services';
import { sendSuccess } from '../utils';

export const postController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { topic } = req.body;
      const post = await postService.generate({
        userId: req.user!.userId,
        topic,
      });
      sendSuccess(res, post, 201);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const posts = await postService.getByUserId(req.user!.userId);
      sendSuccess(res, posts);
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
