import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { 
      type: String, 
      required: [true, 'Category name is required'], 
      unique: true, 
      trim: true 
    },
    slug: { 
      type: String, 
      unique: true, 
      lowercase: true 
    },
    isDeleted: { 
      type: Boolean, 
      default: false 
    }, 
  },
  { timestamps: true }
);

categorySchema.pre('validate', function (this: ICategory) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

export default mongoose.model<ICategory>('Category', categorySchema);