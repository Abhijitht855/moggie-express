import mongoose, { Document, Schema } from 'mongoose';

export interface IOccasion extends Document {
  name: string;
  slug: string;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const occasionSchema = new Schema<IOccasion>(
  {
    name: {
      type: String,
      required: [true, 'Occasion name is required'],
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

occasionSchema.pre('validate', function (this: IOccasion) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

export default mongoose.model<IOccasion>('Occasion', occasionSchema);

