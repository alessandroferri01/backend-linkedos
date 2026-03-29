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

  async verifyAndActivate(userId: string): Promise<{ activated: boolean }> {
    const user = await userRepository.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return { activated: false };
    }

    // Already active — no need to check Stripe
    if (user.subscriptionStatus === 'ACTIVE') {
      return { activated: true };
    }

    // Query Stripe for active subscriptions on this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      await userRepository.updateSubscription(userId, {
        subscriptionStatus: 'ACTIVE',
        creditsRemaining: 100,
      });
      logger.info('Subscription activated via verify endpoint', { userId });
      return { activated: true };
    }

    return { activated: false };
  },

  async cancelSubscription(userId: string): Promise<{ cancelled: boolean }> {
    const user = await userRepository.findById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    if (user.subscriptionStatus !== 'ACTIVE') {
      return { cancelled: false };
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { cancelled: false };
    }

    await stripe.subscriptions.cancel(subscriptions.data[0].id);

    await userRepository.updateSubscription(userId, {
      subscriptionStatus: 'FREE',
      creditsRemaining: 5,
    });

    logger.info('Subscription cancelled by user', { userId });
    return { cancelled: true };
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) {
          logger.warn('Stripe webhook: no userId in checkout session metadata');
          return;
        }

        if (session.mode === 'subscription' && session.subscription) {
          await userRepository.updateSubscription(userId, {
            subscriptionStatus: 'ACTIVE',
            creditsRemaining: 100,
          });
          logger.info('Subscription activated via checkout.session.completed', { userId });
        }
        break;
      }

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
