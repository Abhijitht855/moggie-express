import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  refresh,
  logout,
  getAllUsers,
  addAddress,
  setDefaultAddress,
  deleteAddress,
  requestOTP,
  updateAddress,
} from '../controllers/auth.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';
import { body } from 'express-validator';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Validation rules
const otpRequestValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }),
];

// Unified Passwordless Auth Routes
router.post('/request-otp', otpRequestValidation, authLimiter, requestOTP);
router.post('/login', authLimiter, loginValidation, login);
router.post('/register', authLimiter, loginValidation, register); // Backward-compatible alias
router.post('/refresh-token', refresh);
router.post('/logout', logout);

// Profile
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/me', protect, updateProfile);

// Admin User Management
router.get('/users', protect, adminOnly, getAllUsers);

// Customer Address Book
router.post('/address', protect, addAddress);
router.post('/addresses', protect, addAddress); // Alias
router.put('/address/:addressId', protect, updateAddress);
router.patch('/address/:addressId', protect, updateAddress);
router.patch('/address/:addressId/default', protect, setDefaultAddress);
router.delete('/address/:addressId', protect, deleteAddress);

export default router;
