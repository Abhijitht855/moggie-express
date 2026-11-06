import { Request, Response } from 'express';
import Collection from '../models/Collection';
import Product from '../models/Product';

export const createCollection = async (req: Request, res: Response) => {
  try {
    const { name, description, image } = req.body;
    if (!name) return res.status(400).json({ message: 'Collection name is required' });

    const exists = await Collection.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: false,
    });

    if (exists) {
      return res.status(400).json({ message: 'Collection name already exists' });
    }

    const collection = await Collection.create({ name: name.trim(), description, image });
    res.status(201).json(collection);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCollections = async (req: Request, res: Response) => {
  try {
    const collections = await Collection.find({ isDeleted: false }).sort({ name: 1 });
    res.json(collections);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    const collection = await Collection.findOne({ _id: id, isDeleted: false });
    if (!collection) return res.status(404).json({ message: 'Collection not found' });

    if (name && name.trim().toLowerCase() !== collection.name.toLowerCase()) {
      const exists = await Collection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isDeleted: false,
      });
      if (exists) return res.status(400).json({ message: 'Collection name already exists' });
      collection.name = name.trim();
      collection.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (description !== undefined) collection.description = description;
    if (image !== undefined) collection.image = image;

    await collection.save();
    res.json(collection);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collection = await Collection.findById(id);

    if (!collection || collection.isDeleted) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const productCount = await Product.countDocuments({ collectionId: id, isDeleted: false });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete. There are ${productCount} active products in this collection.`,
      });
    }

    collection.isDeleted = true;
    collection.slug = `${collection.slug}-deleted-${Date.now()}`;
    await collection.save();

    res.json({ message: 'Collection archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

