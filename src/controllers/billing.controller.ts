import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services';
import { sendSuccess } from '../utils';

export const billingController = {
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await stripeService.createCheckoutSession(
        req.user!.userId,
        req.user!.email,
      );
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      await stripeService.handleWebhook(req.body as Buffer, signature);
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  },
};
