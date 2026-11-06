import { Router } from 'express';
import {
  register,
  login,
  getMe,
  refresh,
  logout,
  getAllUsers,
  addAddress,
  setDefaultAddress,
  deleteAddress,
  requestOTP,
  updateAddress
} from '../controllers/auth.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';
import { body } from 'express-validator';
import { sendOrderEmail } from '../utils/mail';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Validation middlewares
const otpRequestValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }),
];

// Routes
router.post('/request-otp', otpRequestValidation, authLimiter, requestOTP);
router.post('/register', registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh-token', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/users', protect, adminOnly, getAllUsers);

router.post('/addresses', protect, addAddress);
router.patch('/addresses/:addressId/default', protect, setDefaultAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);
router.patch('/addresses/:addressId', protect, updateAddress);

router.get('/test-mail', async (req, res) => {
  try {
    const dummyOrder = {
      _id: "6a26c40edc028040041bbf45",
      totalPrice: 1500,
      shippingAddress: { firstName: "TestUser", city: "Kochi", postalCode: "682001" },
      orderItems: [{ name: "Urban Oversized Tee", color: "Black", size: "L", quantity: 1, price: 1500 }]
    };

    await sendOrderEmail("abhijitht855@gmail.com", dummyOrder, 'CONFIRMED');

    res.json({ message: "Test email sent! Check your inbox." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;