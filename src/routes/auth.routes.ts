import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { registerSchema, loginSchema, updateProfileSchema } from './schemas';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;
