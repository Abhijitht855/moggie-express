import { Request, Response } from 'express';
import Order from '../models/Order';

export interface ShippingRateResponse {
  rate: number;
  etd: string;
  courier_name: string;
}

/**
 * Calculate shipping rate and estimated delivery time.
 * Note: Shiprocket integration will be plugged here in the future.
 */
export const getShippingRate = async (
  deliveryPincode: string,
  weight: number = 0.5,
  subtotal?: number
): Promise<ShippingRateResponse | null> => {
  // Validate basic Indian pincode format (6 digits, non-zero start)
  const pinRegex = /^[1-9][0-9]{5}$/;
  if (!pinRegex.test(deliveryPincode.trim())) {
    return null;
  }

  const defaultFee = Number(process.env.DEFAULT_SHIPPING_FEE || 0);
  const freeThreshold = process.env.FREE_SHIPPING_THRESHOLD
    ? Number(process.env.FREE_SHIPPING_THRESHOLD)
    : null;

  let rate = defaultFee;
  if (freeThreshold !== null && subtotal !== undefined && subtotal >= freeThreshold) {
    rate = 0;
  }

  return {
    rate,
    etd: '3-5 Business Days',
    courier_name: 'Standard Delivery',
  };
};

/**
 * @desc Check pincode serviceability and shipping charge
 * @route POST /api/shipping/check
 */
export const checkServiceability = async (req: Request, res: Response) => {
  try {
    const { delivery_pincode, weight, subtotal } = req.body;

    if (!delivery_pincode) {
      return res.status(400).json({ success: false, message: 'delivery_pincode is required' });
    }

    const result = await getShippingRate(
      String(delivery_pincode).trim(),
      weight ? Number(weight) : 0.5,
      subtotal ? Number(subtotal) : undefined
    );

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode. Please enter a valid 6-digit Indian postal code.',
      });
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get order tracking info by tracking ID or Order ID
 * @route GET /api/shipping/track/:id
 */
export const getTrackingInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      $or: [{ trackingId: id }, { _id: id }],
    }).select('orderStatus courierPartner trackingId trackingUrl shippedAt deliveredAt createdAt');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tracking details not found' });
    }

    res.json({
      success: true,
      tracking: {
        orderId: order._id,
        orderStatus: order.orderStatus,
        courierPartner: order.courierPartner || 'Pending assignment',
        trackingId: order.trackingId || '',
        trackingUrl: order.trackingUrl || '',
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
