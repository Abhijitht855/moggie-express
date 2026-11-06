import { Router } from 'express';
import { uploadFiles, deleteFile } from '../controllers/upload.controller';
import { protect, adminOnly } from '../middlewares/auth.middleware';
import { upload } from '../config/imagekit';

const router = Router();

// Upload files (accepts any field name: files, file, image, images)
router.post(
  '/',
  protect,
  adminOnly,
  upload.any(),
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
