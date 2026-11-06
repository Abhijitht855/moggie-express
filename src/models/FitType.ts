import mongoose, { Document, Schema } from 'mongoose';

export interface IFitType extends Document {
  name: string; // e.g. 'Relaxed', 'Slim', 'Oversized', 'Regular', 'A-Line'
  slug: string;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fitTypeSchema = new Schema<IFitType>(
  {
    name: {
      type: String,
      required: [true, 'Fit type name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

fitTypeSchema.pre('validate', function (this: IFitType) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

export default mongoose.model<IFitType>('FitType', fitTypeSchema);

