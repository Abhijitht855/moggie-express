import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  verifyPayment,
  getAllOrders,
} from '../controllers/order.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';
import { orderLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(orderLimiter);

// User Routes
router.post('/', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// Admin Routes
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

export default router;
