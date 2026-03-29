import { Router } from 'express';
import { authController } from '../controllers';
import { validate } from '../middlewares';
import { registerSchema, loginSchema } from './schemas';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

export default router;
