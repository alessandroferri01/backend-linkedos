import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { registerSchema, loginSchema, updateProfileSchema, updateAIProfileSchema } from './schemas';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.get('/ai-profile', authenticate, authController.getAIProfile);
router.put('/ai-profile', authenticate, validate(updateAIProfileSchema), authController.updateAIProfile);

export default router;
