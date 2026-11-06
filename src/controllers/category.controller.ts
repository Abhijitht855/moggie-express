import { Request, Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product'; 

const checkExtraFields = (allowedFields: string[], body: any): string | null => {
  const extraFields = Object.keys(body).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) return `Extra fields not allowed: ${extraFields.join(', ')}`;
  return null;
};

// ─── CREATE CATEGORY ──────────────────────────────────────────────────────────
export const createCategory = async (req: Request, res: Response) => {
  try {
    const allowed = ['name'];
    const extraError = checkExtraFields(allowed, req.body);
    if (extraError) return res.status(400).json({ message: extraError });

    const { name } = req.body;

    const categoryExists = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isDeleted: false 
    });

    if (categoryExists) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const category = await Category.create({ name });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET CATEGORIES ──────────────────────────────────────────────────────────
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE CATEGORY (SOFT DELETE) ──────────────────────────────────────────
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category || category.isDeleted) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const productCount = await Product.countDocuments({ category: id, isDeleted: false });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete. There are ${productCount} active products in this category.` 
      });
    }

    category.isDeleted = true;
    category.slug = `${category.slug}-deleted-${Date.now()}`;
    
    await category.save();
    res.json({ message: 'Category archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};