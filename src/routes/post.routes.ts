import { Router } from 'express';
import { postController } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { generatePostSchema, deletePostSchema } from './schemas';

const router = Router();

router.use(authenticate);

router.post('/generate', validate(generatePostSchema), postController.generate);
router.get('/', postController.getAll);
router.delete('/:id', validate(deletePostSchema), postController.delete);

export default router;
