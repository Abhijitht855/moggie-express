import { Request, Response } from 'express';
import FitType from '../models/FitType';
import Product from '../models/Product';

export const createFitType = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Fit type name is required' });

    const exists = await FitType.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: false,
    });

    if (exists) {
      return res.status(400).json({ message: 'Fit type already exists' });
    }

    const fitType = await FitType.create({ name: name.trim(), description });
    res.status(201).json(fitType);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFitTypes = async (req: Request, res: Response) => {
  try {
    const fitTypes = await FitType.find({ isDeleted: false }).sort({ name: 1 });
    res.json(fitTypes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateFitType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const fitType = await FitType.findOne({ _id: id, isDeleted: false });
    if (!fitType) return res.status(404).json({ message: 'Fit type not found' });

    if (name && name.trim().toLowerCase() !== fitType.name.toLowerCase()) {
      const exists = await FitType.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isDeleted: false,
      });
      if (exists) return res.status(400).json({ message: 'Fit type name already exists' });
      fitType.name = name.trim();
      fitType.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (description !== undefined) fitType.description = description;

    await fitType.save();
    res.json(fitType);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFitType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fitType = await FitType.findById(id);

    if (!fitType || fitType.isDeleted) {
      return res.status(404).json({ message: 'Fit type not found' });
    }

    const productCount = await Product.countDocuments({ fitType: id, isDeleted: false });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete. There are ${productCount} active products with this fit type.`,
      });
    }

    fitType.isDeleted = true;
    fitType.slug = `${fitType.slug}-deleted-${Date.now()}`;
    await fitType.save();

    res.json({ message: 'Fit type archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

