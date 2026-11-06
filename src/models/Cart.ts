import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem extends Document {
    user: mongoose.Types.ObjectId;
    product: mongoose.Types.ObjectId;
    variantId: mongoose.Types.ObjectId;
    sizeId: mongoose.Types.ObjectId; 
    quantity: number;
}

const cartSchema = new Schema<ICartItem>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    sizeId: { type: Schema.Types.ObjectId, required: true },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Quantity cannot be less than 1']
    }
}, { timestamps: true });

cartSchema.index({ user: 1, product: 1, variantId: 1, sizeId: 1 }, { unique: true });

export default mongoose.model<ICartItem>('Cart', cartSchema);