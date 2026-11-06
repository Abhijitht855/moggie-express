import { Request, Response } from 'express';
import Wishlist from '../models/Wishlist';
import Product from '../models/Product';

// ─── GET USER WISHLIST ────────────────────────────────────────────────────────
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const items = await Wishlist.find({ user: req.user!._id })
      .populate({
        path: 'product',
        match: { isDeleted: false },
        populate: [
          { path: 'category', select: 'name slug' },
          { path: 'collectionId', select: 'name slug' },
          { path: 'occasion', select: 'name slug' },
          { path: 'fitType', select: 'name slug' },
        ],
      })
      .sort({ createdAt: -1 });

    // Filter out items where product may have been deleted
    const validItems = items
      .filter((item) => item.product != null)
      .map((item) => {
        const prodItem: any = item.product;
        const prod = prodItem && typeof prodItem.toObject === 'function' ? prodItem.toObject() : prodItem;
        if (prod.variants) {
          prod.variants = prod.variants.filter((v: any) => !v.isDeleted);
        }
        return {
          _id: item._id,
          product: prod,
          createdAt: item.createdAt,
        };
      });

    res.json({ success: true, count: validItems.length, items: validItems });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TOGGLE WISHLIST (Add or Remove) ───────────────────────────────────────────
export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId || req.body.productId;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const existing = await Wishlist.findOne({ user: req.user!._id, product: productId });

    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      return res.json({
        success: true,
        inWishlist: false,
        message: 'Item removed from wishlist',
      });
    }

    const wishlistItem = await Wishlist.create({
      user: req.user!._id,
      product: productId,
    });

    res.status(201).json({
      success: true,
      inWishlist: true,
      message: 'Item added to wishlist',
      item: wishlistItem,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── REMOVE FROM WISHLIST ─────────────────────────────────────────────────────
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const result = await Wishlist.findOneAndDelete({
      user: req.user!._id,
      product: productId,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CHECK WISHLIST STATUS ───────────────────────────────────────────────────
export const checkWishlistStatus = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const exists = await Wishlist.exists({
      user: req.user!._id,
      product: productId,
    });

    res.json({ success: true, inWishlist: Boolean(exists) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
