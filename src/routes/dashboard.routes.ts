import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', protect, adminOnly, getDashboardStats);

export default router;