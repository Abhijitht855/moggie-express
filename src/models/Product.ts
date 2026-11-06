import mongoose, { Document, Schema, Types } from 'mongoose';

// Size Entry Interface
export interface ISizeEntry extends Types.Subdocument {
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'Free Size';
  stock: number;
  price: number;
  originalPrice?: number;
}

// Variant Interface
export interface IVariant extends Types.Subdocument {
  color: string;
  images: string[];
  sizes: Types.DocumentArray<ISizeEntry>;
  isDeleted: boolean;
}

// Size Chart / Measurement Interface
export interface ISizeChartEntry {
  size: string;
  bust?: number;
  waist?: number;
  hip?: number;
  length?: number;
  shoulder?: number;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  shortDescription: string;
  mainDescription: string;
  productStory?: string;
  productDetails?: string[];
  category: mongoose.Types.ObjectId;
  collectionId?: mongoose.Types.ObjectId;
  occasion?: mongoose.Types.ObjectId;
  fitType?: mongoose.Types.ObjectId;
  fabric?: string;
  careInstructions?: string[];
  sizeChart?: ISizeChartEntry[];
  mainImage: string;
  variants: Types.DocumentArray<IVariant>;
  weight: number;
  isFeatured: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sizeEntrySchema = new Schema<ISizeEntry>(
  {
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'],
      required: true,
    },
    stock: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
  },
  { _id: true }
);

const variantSchema = new Schema<IVariant>(
  {
    color: { type: String, required: true, trim: true },
    images: { type: [String], required: true },
    sizes: [sizeEntrySchema],
    isDeleted: { type: Boolean, default: false },
  },
  { _id: true }
);

const sizeChartSchema = new Schema<ISizeChartEntry>(
  {
    size: { type: String, required: true, trim: true },
    bust: { type: Number, min: 0 },
    waist: { type: Number, min: 0 },
    hip: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    shoulder: { type: Number, min: 0 },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    mainDescription: { type: String, required: true },
    productStory: { type: String, trim: true },
    productDetails: { type: [String], default: [] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },
    occasion: { type: mongoose.Schema.Types.ObjectId, ref: 'Occasion' },
    fitType: { type: mongoose.Schema.Types.ObjectId, ref: 'FitType' },
    fabric: { type: String, trim: true },
    careInstructions: { type: [String], default: [] },
    sizeChart: {
      type: [sizeChartSchema],
      default: undefined,
    },
    mainImage: { type: String, required: true },
    weight: { type: Number, default: 0.5 },
    variants: {
      type: [variantSchema],
      validate: {
        validator: function (v: any) {
          const colors = v.map((item: any) => item.color.toLowerCase().trim());
          return colors.length === new Set(colors).size;
        },
        message: 'Duplicate color variants are not allowed',
      },
    },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isDeleted: 1 });
productSchema.index({ collectionId: 1, isDeleted: 1 });
productSchema.index({ occasion: 1, isDeleted: 1 });
productSchema.index({ fitType: 1, isDeleted: 1 });

productSchema.pre('validate', function (this: IProduct) {
  if (this.isModified('name') || (this.name && !this.slug)) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

export default mongoose.model<IProduct>('Product', productSchema);
