import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Category from '../models/Category';
import Collection from '../models/Collection';
import Occasion from '../models/Occasion';
import FitType from '../models/FitType';

const checkExtraFields = (allowedFields: string[], body: any): string | null => {
  const extraFields = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    return `Extra fields not allowed: ${extraFields.join(', ')}`;
  }
  return null;
};

// ─── CREATE PRODUCT ──────────────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response) => {
  try {
    const allowed = [
      'name',
      'shortDescription',
      'mainDescription',
      'productStory',
      'productDetails',
      'category',
      'collectionId',
      'occasion',
      'fitType',
      'fabric',
      'careInstructions',
      'sizeChart',
      'mainImage',
      'weight',
      'isFeatured',
      'variants',
    ];

    const extraError = checkExtraFields(allowed, req.body);
    if (extraError) return res.status(400).json({ message: extraError });

    const {
      name,
      category,
      collectionId,
      occasion,
      fitType,
      fabric,
      careInstructions,
      sizeChart,
      variants,
      weight,
      isFeatured,
      productStory,
      productDetails,
      ...rest
    } = req.body;

    // 1. Require at least one variant
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: 'At least one variant is required' });
    }

    // 2. Category Validation
    const categoryExists = await Category.findById(category);
    if (!categoryExists) return res.status(400).json({ message: 'Invalid Category ID.' });

    // 3. Optional Entity References Validation
    if (collectionId) {
      const colExists = await Collection.findById(collectionId);
      if (!colExists || colExists.isDeleted) {
        return res.status(400).json({ message: 'Invalid Collection ID.' });
      }
    }

    if (occasion) {
      const occExists = await Occasion.findById(occasion);
      if (!occExists || occExists.isDeleted) {
        return res.status(400).json({ message: 'Invalid Occasion ID.' });
      }
    }

    if (fitType) {
      const fitExists = await FitType.findById(fitType);
      if (!fitExists || fitExists.isDeleted) {
        return res.status(400).json({ message: 'Invalid Fit Type ID.' });
      }
    }

    // 4. Weight Validation
    if (weight !== undefined && Number(weight) <= 0) {
      return res.status(400).json({ message: 'Weight must be a positive number' });
    }

    // 5. Variants & Sizes Validation
    const colors = variants.map((v: any) => v.color.toLowerCase().trim());
    if (colors.some((c, index) => colors.indexOf(c) !== index)) {
      return res.status(400).json({ message: 'Duplicate colors found in variants' });
    }

    for (const v of variants) {
      if (!v.images || !Array.isArray(v.images) || v.images.length === 0) {
        return res.status(400).json({
          message: `Each variant must have at least one image (missing for color ${v.color})`,
        });
      }
      if (!v.sizes || !Array.isArray(v.sizes) || v.sizes.length === 0) {
        return res.status(400).json({
          message: `Each variant must have at least one size (missing for color ${v.color})`,
        });
      }
      for (const s of v.sizes) {
        if (s.price <= 0) return res.status(400).json({ message: `Price must be > 0 for size ${s.size}` });
        if (s.stock < 0) return res.status(400).json({ message: `Stock cannot be negative for size ${s.size}` });
      }
    }

    // 6. Size Chart Validation (Optional)
    let processedSizeChart = undefined;
    if (Array.isArray(sizeChart) && sizeChart.length > 0) {
      for (const sc of sizeChart) {
        if (!sc.size) {
          return res.status(400).json({ message: 'Size name is required for each size chart entry' });
        }
      }
      processedSizeChart = sizeChart;
    }

    const product = new Product({
      name,
      category,
      collectionId: collectionId || undefined,
      occasion: occasion || undefined,
      fitType: fitType || undefined,
      fabric,
      careInstructions: Array.isArray(careInstructions) ? careInstructions : undefined,
      sizeChart: processedSizeChart,
      variants,
      productStory,
      productDetails,
      weight: weight ? Number(weight) : 0.5,
      isFeatured: isFeatured === true || isFeatured === 'true',
      ...rest,
    });

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('collectionId', 'name slug')
      .populate('occasion', 'name slug')
      .populate('fitType', 'name slug');

    res.status(201).json(populatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET PRODUCTS (With Filters) ─────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      collection,
      occasion,
      fitType,
      size,
      color,
      isFeatured,
      minPrice,
      maxPrice,
      sort,
      search,
    } = req.query;

    const query: any = { isDeleted: false };

    if (category) {
      if (mongoose.isValidObjectId(category)) {
        query.category = category;
      } else {
        const cat = await Category.findOne({ slug: category, isDeleted: false });
        if (cat) query.category = cat._id;
      }
    }

    if (collection) {
      if (mongoose.isValidObjectId(collection)) {
        query.collectionId = collection;
      } else {
        const col = await Collection.findOne({ slug: collection, isDeleted: false });
        if (col) query.collectionId = col._id;
      }
    }

    if (occasion) {
      if (mongoose.isValidObjectId(occasion)) {
        query.occasion = occasion;
      } else {
        const occ = await Occasion.findOne({ slug: occasion, isDeleted: false });
        if (occ) query.occasion = occ._id;
      }
    }

    if (fitType) {
      if (mongoose.isValidObjectId(fitType)) {
        query.fitType = fitType;
      } else {
        const fit = await FitType.findOne({ slug: fitType, isDeleted: false });
        if (fit) query.fitType = fit._id;
      }
    }

    if (isFeatured !== undefined) {
      query.isFeatured = String(isFeatured) === 'true';
    }

    if (color) {
      query['variants.color'] = { $regex: new RegExp(`^${color}$`, 'i') };
    }

    if (size) {
      query['variants.sizes.size'] = size;
    }

    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);
      query['variants.sizes.price'] = priceFilter;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { shortDescription: { $regex: search as string, $options: 'i' } },
        { fabric: { $regex: search as string, $options: 'i' } },
      ];
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'name-asc') sortOption = { name: 1 };
    else if (sort === 'name-desc') sortOption = { name: -1 };

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('collectionId', 'name slug')
      .populate('occasion', 'name slug')
      .populate('fitType', 'name slug')
      .sort(sortOption);

    const filteredProducts = products.map((product) => {
      const obj = product.toObject() as any;
      if (obj.variants) {
        obj.variants = obj.variants.filter((v: any) => !v.isDeleted);
      }
      return obj;
    });

    res.json(filteredProducts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false })
      .populate('category', 'name slug')
      .populate('collectionId', 'name slug')
      .populate('occasion', 'name slug')
      .populate('fitType', 'name slug');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const productObj = product.toObject() as any;
    if (productObj.variants) {
      productObj.variants = productObj.variants.filter((v: any) => !v.isDeleted);
    }

    res.json(productObj);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE PRODUCT (BASIC INFO & ATTRIBUTES) ────────────────────────────────
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const allowed = [
      'name',
      'shortDescription',
      'mainDescription',
      'productStory',
      'productDetails',
      'category',
      'collectionId',
      'occasion',
      'fitType',
      'fabric',
      'careInstructions',
      'sizeChart',
      'isFeatured',
      'weight',
      'mainImage',
    ];

    const extraError = checkExtraFields(allowed, req.body);
    if (extraError) return res.status(400).json({ message: extraError });

    const {
      category,
      collectionId,
      occasion,
      fitType,
      fabric,
      careInstructions,
      sizeChart,
      weight,
      isFeatured,
      productStory,
      productDetails,
      ...updateData
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (category) {
      const exists = await Category.findById(category);
      if (!exists) return res.status(400).json({ message: 'Invalid Category ID' });
      product.category = category;
    }

    if (collectionId !== undefined) {
      if (collectionId) {
        const colExists = await Collection.findById(collectionId);
        if (!colExists || colExists.isDeleted) return res.status(400).json({ message: 'Invalid Collection ID' });
        product.collectionId = collectionId;
      } else {
        product.collectionId = undefined;
      }
    }

    if (occasion !== undefined) {
      if (occasion) {
        const occExists = await Occasion.findById(occasion);
        if (!occExists || occExists.isDeleted) return res.status(400).json({ message: 'Invalid Occasion ID' });
        product.occasion = occasion;
      } else {
        product.occasion = undefined;
      }
    }

    if (fitType !== undefined) {
      if (fitType) {
        const fitExists = await FitType.findById(fitType);
        if (!fitExists || fitExists.isDeleted) return res.status(400).json({ message: 'Invalid Fit Type ID' });
        product.fitType = fitType;
      } else {
        product.fitType = undefined;
      }
    }

    if (fabric !== undefined) product.fabric = fabric;
    if (careInstructions !== undefined) product.careInstructions = careInstructions;

    if (sizeChart !== undefined) {
      if (Array.isArray(sizeChart) && sizeChart.length > 0) {
        product.sizeChart = sizeChart;
      } else {
        product.sizeChart = undefined;
      }
    }

    if (weight !== undefined) {
      if (Number(weight) <= 0) return res.status(400).json({ message: 'Weight must be greater than 0' });
      product.weight = Number(weight);
    }

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured === true || isFeatured === 'true';
    }

    if (productStory !== undefined) product.productStory = productStory;
    if (productDetails !== undefined) product.productDetails = productDetails;

    Object.assign(product, updateData);

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('collectionId', 'name slug')
      .populate('occasion', 'name slug')
      .populate('fitType', 'name slug');

    res.json(populatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE PRODUCT ──────────────────────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isDeleted = true;

    const timestamp = Date.now();
    product.name = `${product.name} (Archived-${timestamp})`;
    product.slug = `${product.slug}-deleted-${timestamp}`;

    await product.save();
    res.json({ message: 'Product archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADD VARIANT ─────────────────────────────────────────────────────────────
export const addVariant = async (req: Request, res: Response) => {
  try {
    const allowed = ['color', 'images', 'sizes'];
    const extraError = checkExtraFields(allowed, req.body);
    if (extraError) return res.status(400).json({ message: extraError });

    const { color, images, sizes } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required for a variant' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const colorExists = product.variants.some(
      (v) => !v.isDeleted && v.color.toLowerCase().trim() === color.toLowerCase().trim()
    );
    if (colorExists) return res.status(400).json({ message: `Color "${color}" already exists` });

    product.variants.push({ color, images, sizes } as any);
    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE VARIANT ──────────────────────────────────────────────────────────
export const updateVariant = async (req: Request, res: Response) => {
  try {
    const allowed = ['color', 'images'];
    const extraError = checkExtraFields(allowed, req.body);
    if (extraError) return res.status(400).json({ message: extraError });

    const { color, images } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(req.params.variantId as any);
    if (!variant || variant.isDeleted) {
      return res.status(404).json({ message: 'Active variant not found' });
    }

    if (color && color.toLowerCase().trim() !== variant.color.toLowerCase().trim()) {
      const colorExists = product.variants.some(
        (v) => !v.isDeleted && v.color.toLowerCase().trim() === color.toLowerCase().trim()
      );
      if (colorExists) return res.status(400).json({ message: 'Color name already exists' });
      variant.color = color;
    }

    if (images) {
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: 'At least one image is required for a variant' });
      }
      variant.images = images;
    }

    await product.save();
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE VARIANT ──────────────────────────────────────────────────────────
export const deleteVariant = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(req.params.variantId as any);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    variant.isDeleted = true;
    variant.color = `${variant.color}-archived-${Date.now()}`;

    await product.save();
    res.json({ message: 'Variant archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADD SIZE ────────────────────────────────────────────────────────────────
export const addSize = async (req: Request, res: Response) => {
  try {
    const { size, stock, price } = req.body;
    if (price <= 0) return res.status(400).json({ message: 'Price must be greater than 0' });
    if (stock < 0) return res.status(400).json({ message: 'Stock cannot be negative' });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(req.params.variantId as any);
    if (!variant || variant.isDeleted) return res.status(404).json({ message: 'Active variant not found' });

    if (variant.sizes.some((s) => s.size === size)) {
      return res.status(400).json({ message: `Size "${size}" already exists` });
    }

    variant.sizes.push({ size, stock, price } as any);
    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE SIZE ─────────────────────────────────────────────────────────────
export const updateSize = async (req: Request, res: Response) => {
  try {
    const { stock, price, size } = req.body;

    const product = await Product.findById(req.params.id);
    const variant = product?.variants.id(req.params.variantId as any);
    if (!variant || variant.isDeleted) return res.status(404).json({ message: 'Active variant not found' });

    const sizeEntry = variant.sizes.id(req.params.sizeId as any);
    if (!sizeEntry) return res.status(404).json({ message: 'Size entry not found' });

    if (price !== undefined && price <= 0) return res.status(400).json({ message: 'Price must be greater than 0' });
    if (stock !== undefined && stock < 0) return res.status(400).json({ message: 'Stock cannot be negative' });

    if (size && size !== sizeEntry.size) {
      if (variant.sizes.some((s) => s.size === size)) return res.status(400).json({ message: 'Size already exists' });
      sizeEntry.size = size;
    }

    if (stock !== undefined) sizeEntry.stock = stock;
    if (price !== undefined) sizeEntry.price = price;

    await product?.save();
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GLOBAL SEARCH ──────────────────────────────────────────────────────────
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ products: [], categories: [], collections: [], occasions: [] });

    const products = await Product.find({
      isDeleted: false,
      $or: [
        { name: { $regex: q as string, $options: 'i' } },
        { shortDescription: { $regex: q as string, $options: 'i' } },
        { fabric: { $regex: q as string, $options: 'i' } },
      ],
    })
      .select('name mainImage slug variants fabric')
      .limit(10);

    const categories = await Category.find({
      isDeleted: false,
      name: { $regex: q as string, $options: 'i' },
    })
      .select('name slug')
      .limit(5);

    const collections = await Collection.find({
      isDeleted: false,
      name: { $regex: q as string, $options: 'i' },
    })
      .select('name slug image')
      .limit(5);

    const occasions = await Occasion.find({
      isDeleted: false,
      name: { $regex: q as string, $options: 'i' },
    })
      .select('name slug')
      .limit(5);

    res.json({
      success: true,
      results: { products, categories, collections, occasions },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── SITEMAP ────────────────────────────────────────────────────────────────
export const getSitemap = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isDeleted: false }).select('slug updatedAt');
    const baseUrl = 'https://moggieattires.com';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    xml += `<url><loc>${baseUrl}/</loc><priority>1.0</priority></url>`;

    products.forEach((prod) => {
      xml += `
        <url>
          <loc>${baseUrl}/product/${prod.slug}</loc>
          <lastmod>${prod.updatedAt.toISOString().split('T')[0]}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).send('Error generating sitemap');
  }
};
