import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { registerSchema, loginSchema } from './schemas';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;
