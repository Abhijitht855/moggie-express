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
    const allowed = ['name', 'image'];
    const extraError = checkExtraFields(allowed, req.body);
    if (extraError) return res.status(400).json({ message: extraError });

    const { name, image } = req.body;

    const categoryExists = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: false 
    });

    if (categoryExists) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const category = await Category.create({ 
      name: name.trim(),
      image: image?.trim() || '' 
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET CATEGORIES ──────────────────────────────────────────────────────────
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 }).lean();

    // Dynamically resolve image: if category has no explicit image,
    // automatically inherit the first product's first image under this category
    const categoriesWithImages = await Promise.all(
      categories.map(async (cat: any) => {
        if (cat.image && cat.image.trim()) {
          return cat;
        }

        const firstProduct: any = await Product.findOne(
          { category: cat._id, isDeleted: false },
          { mainImage: 1, 'variants.images': 1 }
        ).sort({ createdAt: -1 }).lean();

        const autoImage =
          firstProduct?.mainImage ||
          firstProduct?.variants?.[0]?.images?.[0] ||
          '';

        return {
          ...cat,
          image: autoImage,
          isAutoImage: !cat.image && !!autoImage,
        };
      })
    );

    res.json(categoriesWithImages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE CATEGORY ────────────────────────────────────────────────────────
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const exists = await Category.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isDeleted: false,
      });
      if (exists) return res.status(400).json({ message: 'Category name already exists' });

      category.name = name.trim();
      category.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (image !== undefined) {
      category.image = image.trim();
    }

    await category.save();
    res.json(category);
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