import { Router } from 'express';
import {
  createFitType,
  getFitTypes,
  updateFitType,
  deleteFitType,
} from '../controllers/fitType.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getFitTypes);
router.post('/', protect, adminOnly, createFitType);
router.put('/:id', protect, adminOnly, updateFitType);
router.delete('/:id', protect, adminOnly, deleteFitType);

export default router;

