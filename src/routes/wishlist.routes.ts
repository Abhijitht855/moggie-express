import { Router } from 'express';
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  checkWishlistStatus,
} from '../controllers/wishlist.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// All wishlist routes require authentication
router.use(protect);

router.get('/', getWishlist);
router.post('/toggle', toggleWishlist);
router.post('/toggle/:productId', toggleWishlist);
router.get('/check/:productId', checkWishlistStatus);
router.delete('/:productId', removeFromWishlist);

export default router;

