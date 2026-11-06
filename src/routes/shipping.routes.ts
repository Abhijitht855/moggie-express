import express from 'express';
import { checkServiceability, getTrackingInfo } from '../controllers/shipping.controller';

const router = express.Router();

router.post('/check', checkServiceability);
router.get('/track/:id', getTrackingInfo);

export default router;
