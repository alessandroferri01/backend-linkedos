import { Router } from 'express';
import { linkedinController } from '../controllers/linkedin.controller';
import { authenticate } from '../middlewares';

const router = Router();

// OAuth flow
router.get('/connect', authenticate, linkedinController.connect);
router.get('/callback', linkedinController.callback); // No auth - redirect from LinkedIn
router.delete('/disconnect', authenticate, linkedinController.disconnect);
router.get('/status', authenticate, linkedinController.status);

// Post operations
router.post('/publish/:postId', authenticate, linkedinController.publishPost);
router.get('/stats/:postId', authenticate, linkedinController.getPostStats);

export default router;
