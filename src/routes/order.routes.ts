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

// User Routes
router.post('/', protect, orderLimiter, createOrder);
router.post('/verify', protect, orderLimiter, verifyPayment);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// Admin Routes
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

export default router;
