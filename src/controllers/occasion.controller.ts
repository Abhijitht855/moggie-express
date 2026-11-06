import { Request, Response } from 'express';
import Occasion from '../models/Occasion';
import Product from '../models/Product';

export const createOccasion = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Occasion name is required' });

    const exists = await Occasion.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: false,
    });

    if (exists) {
      return res.status(400).json({ message: 'Occasion name already exists' });
    }

    const occasion = await Occasion.create({ name: name.trim(), description });
    res.status(201).json(occasion);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOccasions = async (req: Request, res: Response) => {
  try {
    const occasions = await Occasion.find({ isDeleted: false }).sort({ name: 1 });
    res.json(occasions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOccasion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const occasion = await Occasion.findOne({ _id: id, isDeleted: false });
    if (!occasion) return res.status(404).json({ message: 'Occasion not found' });

    if (name && name.trim().toLowerCase() !== occasion.name.toLowerCase()) {
      const exists = await Occasion.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isDeleted: false,
      });
      if (exists) return res.status(400).json({ message: 'Occasion name already exists' });
      occasion.name = name.trim();
      occasion.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (description !== undefined) occasion.description = description;

    await occasion.save();
    res.json(occasion);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteOccasion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const occasion = await Occasion.findById(id);

    if (!occasion || occasion.isDeleted) {
      return res.status(404).json({ message: 'Occasion not found' });
    }

    const productCount = await Product.countDocuments({ occasion: id, isDeleted: false });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete. There are ${productCount} active products with this occasion.`,
      });
    }

    occasion.isDeleted = true;
    occasion.slug = `${occasion.slug}-deleted-${Date.now()}`;
    await occasion.save();

    res.json({ message: 'Occasion archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

