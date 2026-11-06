import { Router } from 'express';
import {
  createOccasion,
  getOccasions,
  updateOccasion,
  deleteOccasion,
} from '../controllers/occasion.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getOccasions);
router.post('/', protect, adminOnly, createOccasion);
router.put('/:id', protect, adminOnly, updateOccasion);
router.delete('/:id', protect, adminOnly, deleteOccasion);

export default router;

