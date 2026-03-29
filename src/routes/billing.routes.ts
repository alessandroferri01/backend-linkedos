import { Router } from 'express';
import { billingController } from '../controllers';
import { authenticate } from '../middlewares';
import express from 'express';

const router = Router();

router.post('/create-session', authenticate, billingController.createSession);

// Stripe webhook needs raw body — applied at app level
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.webhook);

export default router;
