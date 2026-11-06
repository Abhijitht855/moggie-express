import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  updateSize,
  addSize,
  globalSearch,
  getSitemap
} from '../controllers/product.controller';
import { adminOnly, protect } from '../middlewares/auth.middleware';
import { productLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(productLimiter);

// =========================
// Public Routes
// =========================

router.get('/', getProducts);

router.get('/search/global', globalSearch);

router.get('/seo/sitemap.xml', getSitemap);

router.get('/:id', getProductById);

// =========================
// Admin Routes - Product Basic
// =========================

router.post('/', protect, adminOnly, createProduct);

router.put('/:id', protect, adminOnly, updateProduct);

router.delete('/:id', protect, adminOnly, deleteProduct);

// =========================
// Admin Routes - Variant Management
// =========================

router.post('/:id/variants', protect, adminOnly, addVariant);

router.put('/:id/variants/:variantId', protect, adminOnly, updateVariant);

router.delete('/:id/variants/:variantId', protect, adminOnly, deleteVariant);

// =========================
// Admin Routes - Size Management
// =========================

router.post('/:id/variants/:variantId/sizes', protect, adminOnly, addSize);

router.put(
  '/:id/variants/:variantId/sizes/:sizeId',
  protect,
  adminOnly,
  updateSize
);

export default router;