import { Router } from 'express';
import { uploadFiles, deleteFile } from '../controllers/upload.controller';
import { protect, adminOnly } from '../middlewares/auth.middleware';
import { upload } from '../config/imagekit';

const router = Router();

// Upload multiple files (images/videos) to ImageKit
router.post(
  '/',
  protect,
  adminOnly,
  upload.array('files', 10),
  uploadFiles
);

// Delete file from ImageKit by fileId
router.delete(
  '/:fileId',
  protect,
  adminOnly,
  deleteFile
);

export default router;
