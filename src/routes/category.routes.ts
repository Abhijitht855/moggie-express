import { Router } from 'express';
import { 
  createCategory, 
  getCategories, 
  deleteCategory 
} from '../controllers/category.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getCategories);

router.post('/', protect, adminOnly, createCategory);
router.delete('/:id',protect, adminOnly, deleteCategory);

export default router;