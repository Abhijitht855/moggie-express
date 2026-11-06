import { Request, Response } from 'express';
import Banner from '../models/Banner';

// ─── GET ACTIVE BANNERS (Public) ───────────────────────────────────────
export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ priority: 1 });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET ALL BANNERS (Admin Only) ──────────────────────────────────────
export const getAllBanners = async (req: Request, res: Response) => {
  try {
    const banners = await Banner.find({}).sort({ priority: 1 });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADD NEW BANNER (With Priority Shift) ──────────────────────────────
export const createBanner = async (req: Request, res: Response) => {
  try {
    const { imageUrl, link, priority, isActive } = req.body;

    if (priority !== undefined) {
      await Banner.updateMany(
        { priority: { $gte: priority } },
        { $inc: { priority: 1 } }
      );
    }

    const banner = await Banner.create({ imageUrl, link, priority, isActive });
    res.status(201).json(banner);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE BANNER ───────────────────────────────────────────────────
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { priority } = req.body;

    const currentBanner = await Banner.findById(id);
    if (!currentBanner) return res.status(404).json({ message: 'Banner not found' });

    if (priority !== undefined && priority !== currentBanner.priority) {
      await Banner.updateMany(
        {
          priority: { $gte: priority },
          _id: { $ne: id as any }
        },
        { $inc: { priority: 1 } }
      );
    }

    const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true });
    res.json(banner);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE BANNER ───────────────────────────────────────────────────
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    res.json({ message: 'Banner removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};