import { Router } from 'express';
import { 
  createCategory, 
  getCategories, 
  updateCategory,
  deleteCategory 
} from '../controllers/category.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getCategories);

router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;