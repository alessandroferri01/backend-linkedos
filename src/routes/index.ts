import { Router } from 'express';
import authRoutes from './auth.routes';
import postRoutes from './post.routes';
import billingRoutes from './billing.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/billing', billingRoutes);

export default router;
