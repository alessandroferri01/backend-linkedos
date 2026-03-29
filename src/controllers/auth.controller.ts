import { Request, Response, NextFunction } from 'express';
import { authService } from '../services';
import { sendSuccess } from '../utils';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.register(email, password);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.me(req.user!.userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },
};
