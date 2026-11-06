import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title?: string;
  subtitle?: string;
  imageUrl: string;
  link?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    link: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IBanner>('Banner', bannerSchema);