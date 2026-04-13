import { Request, Response, NextFunction } from 'express';
import { linkedinService } from '../services/linkedin.service';
import { sendSuccess } from '../utils';
import { ENV } from '../config';
import crypto from 'crypto';

// Store OAuth states temporarily (in production use Redis/DB)
const pendingStates = new Map<string, { userId: string; expiresAt: number }>();

// Clean expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates.entries()) {
    if (val.expiresAt < now) pendingStates.delete(key);
  }
}, 5 * 60 * 1000);

export const linkedinController = {
  async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      pendingStates.set(state, {
        userId: req.user!.userId,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
      });

      const url = linkedinService.getAuthorizationUrl(state);
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  },

  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state, error } = req.query;

      if (error || !code || !state) {
        res.redirect(`${ENV.FRONTEND_URL}/dashboard/profile?linkedin=error`);
        return;
      }

      const stateData = pendingStates.get(state as string);
      if (!stateData || stateData.expiresAt < Date.now()) {
        pendingStates.delete(state as string);
        res.redirect(`${ENV.FRONTEND_URL}/dashboard/profile?linkedin=expired`);
        return;
      }

      pendingStates.delete(state as string);

      await linkedinService.connectAccount(stateData.userId, code as string);
      res.redirect(`${ENV.FRONTEND_URL}/dashboard/profile?linkedin=success`);
    } catch (error) {
      res.redirect(`${ENV.FRONTEND_URL}/dashboard/profile?linkedin=error`);
    }
  },

  async disconnect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await linkedinService.disconnectAccount(req.user!.userId);
      sendSuccess(res, { disconnected: true });
    } catch (error) {
      next(error);
    }
  },

  async status(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await linkedinService.getConnectionStatus(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async publishPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = req.params.postId as string;
      const result = await linkedinService.publishPost(req.user!.userId, postId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getPostStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = req.params.postId as string;
      const stats = await linkedinService.getPostStats(req.user!.userId, postId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },
};
