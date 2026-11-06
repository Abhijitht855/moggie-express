import { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/Order';
import Product from '../models/Product';
import Cart from '../models/Cart';
import Razorpay from 'razorpay';
import { getShippingRate } from './shipping.controller';
import User from '../models/User';
import mongoose from 'mongoose';
import { sendOrderEmail } from '../utils/mail';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const finalizeOrderPayment = async (order: any, paymentId: string, signature: string) => {
  const result = await Order.updateOne(
    { _id: order._id, isPaid: false },
    {
      $set: {
        isPaid: true,
        paidAt: new Date(),
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
    }
  );

  if (result.modifiedCount === 0) return;

  try {
    const user = await User.findById(order.user);
    if (user && (user.name === 'Guest User' || !user.name)) {
      user.name = order.shippingAddress.firstName + ' ' + (order.shippingAddress.lastName || '');
      await user.save();
    }

    if (user && user.email) {
      await sendOrderEmail(user.email, order, 'CONFIRMED');
    }
  } catch (error) {
    console.error('❌ User update or Email failed:', error);
  }

  // Deduct stock for each item in the order
  for (const item of order.orderItems) {
    await Product.updateOne(
      { _id: item.product, 'variants._id': item.variantId, 'variants.sizes._id': item.sizeId },
      { $inc: { 'variants.$[v].sizes.$[s].stock': -item.quantity } },
      { arrayFilters: [{ 'v._id': item.variantId }, { 's._id': item.sizeId }] }
    );
  }

  if (order.fromCart) {
    await Cart.deleteMany({ user: order.user });
  }
};

// 1. Create Initial Order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { orderItems: itemsFromClient, shippingAddress, fromCart } = req.body;

    if (!itemsFromClient || itemsFromClient.length === 0) {
      return res.status(400).json({ message: 'No order items found' });
    }

    let userCart: any[] = [];
    if (fromCart) {
      userCart = await Cart.find({ user: req.user!._id });
      if (userCart.length === 0) return res.status(400).json({ message: 'Cart is empty' });
    }

    const orderItems = [];
    let calculatedItemsPrice = 0;
    let totalWeight = 0;

    for (const item of itemsFromClient) {
      const product = await Product.findOne({ _id: item.product, isDeleted: false });
      if (!product) return res.status(404).json({ message: `Product not found` });

      const variant = (product.variants as any).id(item.variantId);
      if (!variant || variant.isDeleted) {
        return res.status(404).json({ message: `Variant not found for ${product.name}` });
      }

      const sizeEntry = (variant.sizes as any).id(item.sizeId);
      if (!sizeEntry) {
        return res.status(404).json({ message: `Size not found for ${product.name}` });
      }

      if (fromCart) {
        const cartItem = userCart.find(
          (c) =>
            c.product.toString() === item.product.toString() &&
            c.variantId.toString() === item.variantId.toString() &&
            c.sizeId.toString() === item.sizeId.toString()
        );
        if (!cartItem || item.quantity > cartItem.quantity) {
          return res.status(400).json({ message: `Invalid quantity for ${product.name}` });
        }
      }

      if (sizeEntry.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      orderItems.push({
        product: product._id,
        variantId: variant._id,
        sizeId: sizeEntry._id,
        name: product.name,
        size: sizeEntry.size,
        color: variant.color,
        quantity: item.quantity,
        image: product.mainImage,
        price: sizeEntry.price,
      });

      calculatedItemsPrice += sizeEntry.price * item.quantity;
      totalWeight += (product.weight || 0.5) * item.quantity;
    }

    const shippingInfo = await getShippingRate(
      shippingAddress.postalCode,
      totalWeight,
      calculatedItemsPrice
    );
    const shippingPrice = shippingInfo ? shippingInfo.rate : 0;
    const finalTotalPrice = calculatedItemsPrice + shippingPrice;

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(finalTotalPrice * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    const order = new Order({
      user: req.user!._id,
      orderItems,
      shippingAddress,
      paymentMethod: 'Razorpay',
      shippingPrice: shippingPrice,
      totalPrice: finalTotalPrice,
      totalWeight: totalWeight,
      razorpayOrderId: rzpOrder.id,
      fromCart: fromCart || false,
    });

    await order.save();
    res.status(201).json({ success: true, order, razorpayOrder: rzpOrder });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Verify Payment
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.isPaid) {
      return res.json({ success: true, message: 'Order already confirmed', orderId: order._id });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    await finalizeOrderPayment(order, razorpay_payment_id, razorpay_signature);
    res.json({ success: true, message: 'Order confirmed', orderId: order._id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Razorpay Webhook Handler
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers['x-razorpay-signature'] as string;

    const rawBody = req.body.toString();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentDetails = payload.payload.payment.entity;
      const order = await Order.findOne({ razorpayOrderId: paymentDetails.order_id });

      if (order && !order.isPaid) {
        await finalizeOrderPayment(order, paymentDetails.id, signature);
      }
    }

    res.status(200).send('ok');
  } catch (err: any) {
    console.error('❌ Webhook Error:', err.message);
    res.status(500).send(err.message);
  }
};

// 4. Update Order Status (Admin Manual Management)
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status, courierPartner, trackingId, trackingUrl } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be modified' });
    }

    if (status === 'Shipped' && !order.isPaid) {
      return res.status(400).json({ message: 'Cannot ship an unpaid order. Please verify payment first.' });
    }

    if (courierPartner !== undefined) order.courierPartner = courierPartner;
    if (trackingId !== undefined) order.trackingId = trackingId;
    if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;

    if (status === 'Shipped' && order.orderStatus !== 'Shipped') {
      order.orderStatus = 'Shipped';
      order.shippedAt = new Date();

      const user = await User.findById(order.user);
      if (user && user.email) {
        await sendOrderEmail(user.email, order, 'SHIPPED');
      }
    } else if (status === 'Delivered' && !order.isDelivered) {
      order.isDelivered = true;
      order.deliveredAt = new Date();
      order.orderStatus = 'Delivered';

      const user = await User.findById(order.user);
      if (user && user.email) {
        await sendOrderEmail(user.email, order, 'DELIVERED');
      }
    } else if (status === 'Cancelled') {
      if (order.isPaid) {
        for (const item of order.orderItems) {
          await Product.updateOne(
            {
              _id: item.product,
              'variants._id': item.variantId,
              'variants.sizes._id': item.sizeId,
            },
            { $inc: { 'variants.$[v].sizes.$[s].stock': item.quantity } },
            { arrayFilters: [{ 'v._id': item.variantId }, { 's._id': item.sizeId }] }
          );
        }
      }
      order.orderStatus = 'Cancelled';
    } else if (status) {
      order.orderStatus = status;
    }

    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Get All Orders (Admin with filters)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const {
      search,
      startDate,
      endDate,
      status,
      userId,
      limit = 50,
      page = 1,
      sort = '-createdAt',
    } = req.query;

    let query: any = {};

    if (userId && mongoose.isValidObjectId(userId)) {
      query.user = userId;
    }

    if (search) {
      const searchStr = search as string;
      const users = await User.find({
        email: { $regex: searchStr, $options: 'i' },
      }).select('_id');
      const userIds = users.map((u) => u._id);
      const orConditions: any[] = [
        { razorpayOrderId: { $regex: searchStr, $options: 'i' } },
        { trackingId: { $regex: searchStr, $options: 'i' } },
        { user: { $in: userIds } },
      ];
      if (mongoose.isValidObjectId(searchStr)) {
        orConditions.push({ _id: searchStr });
      }
      query.$or = orConditions;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)),
      };
    }

    if (status) {
      query.orderStatus = status;
    }

    const limitNum = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * limitNum;
    const sortStr = sort as string;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort(sortStr)
      .skip(skip)
      .limit(limitNum);

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Get My Orders (Customer)
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({
      user: req.user!._id,
      isPaid: true,
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 7. Get Order By ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOwner = order.user._id.toString() === req.user!._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(401).json({ message: 'Not authorized to view this order' });
    }

    if (!isAdmin && !order.isPaid) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
