import Stripe from 'stripe';
import { ENV } from '../config';
import { userRepository } from '../repositories';
import { creditService } from './credit.service';
import { NotFoundError, logger } from '../utils';

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY);

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || '';

export const stripeService = {
  async createCheckoutSession(userId: string, email: string): Promise<string> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
      await userRepository.setStripeCustomerId(userId, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing/cancel`,
      metadata: { userId },
    });

    return session.url!;
  },

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, ENV.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const user = await userRepository.findByStripeCustomerId(customerId);
        if (!user) {
          logger.warn('Stripe webhook: user not found for customer', { customerId });
          return;
        }

        if (subscription.status === 'active') {
          await userRepository.updateSubscription(user.id, {
            subscriptionStatus: 'ACTIVE',
            creditsRemaining: 100,
          });
          logger.info('Subscription activated', { userId: user.id });
        } else if (subscription.status === 'past_due') {
          await userRepository.updateSubscription(user.id, {
            subscriptionStatus: 'PAST_DUE',
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const user = await userRepository.findByStripeCustomerId(customerId);
        if (!user) return;

        await userRepository.updateSubscription(user.id, {
          subscriptionStatus: 'FREE',
          creditsRemaining: 5,
        });
        logger.info('Subscription cancelled', { userId: user.id });
        break;
      }

      default:
        logger.info('Unhandled Stripe event', { type: event.type });
    }
  },
};
