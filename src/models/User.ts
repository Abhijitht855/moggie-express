import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IAddress {
  _id?: Types.ObjectId;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  addresses: Types.DocumentArray<IAddress & Types.Subdocument>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const addressSchema = new Schema<IAddress>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true, default: 'Kerala' },
    postalCode: { type: String, required: true },
    phone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    addresses: [addressSchema],
  },
  { timestamps: true }
);


userSchema.pre('save', async function () {
  if (!this.password || !this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error: any) {
    throw error;
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUserDocument>('User', userSchema);