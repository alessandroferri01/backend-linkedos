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

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, phone } = req.body;
      const user = await authService.updateProfile(req.user!.userId, { firstName, lastName, phone });
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },

  async getAIProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getAIProfile(req.user!.userId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  },

  async updateAIProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profession, tone, targetAudience, writingStyle } = req.body;
      const profile = await authService.updateAIProfile(req.user!.userId, {
        profession, tone, targetAudience, writingStyle,
      });
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  },
};
