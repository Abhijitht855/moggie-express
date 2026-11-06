import { Request, Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';

// ─── ADD TO CART ──────────────────────────────────────────────────────────
export const addToCart = async (req: Request, res: Response) => {
    try {
        const { productId, variantId, sizeId, quantity } = req.body;
        if (!quantity || quantity < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });

        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) return res.status(404).json({ message: 'Product not found or unavailable' });

        const variant = product.variants.id(variantId);
        if (!variant || variant.isDeleted) return res.status(400).json({ message: 'Selected variant is unavailable' });

        const sizeEntry = variant.sizes.id(sizeId);
        if (!sizeEntry) return res.status(400).json({ message: 'Selected size not found' });

        if (sizeEntry.stock <= 0) return res.status(400).json({ message: 'Out of stock' });
        if (quantity > sizeEntry.stock) return res.status(400).json({ message: `Only ${sizeEntry.stock} left` });

        let cartItem = await Cart.findOne({ user: req.user!._id, product: productId, variantId, sizeId });

        if (cartItem) {
            const newQty = cartItem.quantity + Number(quantity);
            if (newQty > sizeEntry.stock) return res.status(400).json({ message: 'Total exceeds available stock' });
            cartItem.quantity = newQty;
            await cartItem.save();
        } else {
            cartItem = await Cart.create({ user: req.user!._id, product: productId, variantId, sizeId, quantity });
        }
        res.status(201).json(cartItem);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── GET CART ─────────────────────────────────────────────────────────────
export const getCart = async (req: Request, res: Response) => {
    try {
        const cartItems = await Cart.find({ user: req.user!._id }).populate('product');

        let totalPrice = 0;
        let totalQuantity = 0;

        const formattedCart = cartItems.map((item: any) => {
            if (!item.product || item.product.isDeleted) return null;

            const productObj = item.product.toObject();
            
            const variant = productObj.variants.find(
                (v: any) => v._id.toString() === item.variantId.toString() && !v.isDeleted
            );
            
            if (!variant) return null;

            const sizeDetail = variant.sizes.find(
                (s: any) => s._id.toString() === item.sizeId.toString()
            );

            if (!sizeDetail) return null;

            const price = sizeDetail.price || 0;
            const subtotal = price * item.quantity;
            totalPrice += subtotal;
            totalQuantity += item.quantity;

            return {
                _id: item._id,
                productId: productObj._id,
                variantId: item.variantId,
                sizeId: item.sizeId,
                name: productObj.name,
                slug: productObj.slug,
                mainImage: productObj.mainImage,
                quantity: item.quantity,
                color: variant.color,
                image: variant.images[0] || productObj.mainImage,
                size: sizeDetail.size,
                price,
                stock: sizeDetail.stock,
                subtotal
            };
        }).filter(Boolean);

        res.json({ items: formattedCart, totalQuantity, totalPrice, totalItems: formattedCart.length });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── UPDATE QUANTITY ──────────────────────────────────────────────────────
export const updateCartQuantity = async (req: Request, res: Response) => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity < 1) return res.status(400).json({ message: 'Invalid quantity' });

        const cartItem = await Cart.findOne({ _id: req.params.id, user: req.user!._id });
        if (!cartItem) return res.status(404).json({ message: 'Cart item not found' });

        const product = await Product.findOne({ _id: cartItem.product, isDeleted: false });
        if (!product) return res.status(400).json({ message: 'Product is no longer available' });

        const variant = product.variants.id(cartItem.variantId as any);
        if (!variant || variant.isDeleted) return res.status(400).json({ message: 'Variant is no longer available' });

        const sizeEntry = variant.sizes.id(cartItem.sizeId as any);

        if (!sizeEntry || quantity > sizeEntry.stock) return res.status(400).json({ message: 'Insufficient stock' });

        cartItem.quantity = Number(quantity);
        await cartItem.save();
        res.json(cartItem);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── REMOVE FROM CART ──────────────────────────────────────────────────────
export const removeFromCart = async (req: Request, res: Response) => {
    try {
        await Cart.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
        res.json({ message: 'Item removed from cart' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};