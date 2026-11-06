import { Router } from 'express';
import {
  createCollection,
  getCollections,
  updateCollection,
  deleteCollection,
} from '../controllers/collection.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getCollections);
router.post('/', protect, adminOnly, createCollection);
router.put('/:id', protect, adminOnly, updateCollection);
router.delete('/:id', protect, adminOnly, deleteCollection);

export default router;

