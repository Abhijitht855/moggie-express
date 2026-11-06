import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import Category from '../models/Category';


export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      totalProducts,
      totalUsers,
      totalCategories,
      orderStats,
      paidOrdersData
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments({ isDeleted: false }),
      User.countDocuments(),
      Category.countDocuments({ isDeleted: false }),
      
      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
      ]),

      Order.aggregate([
        { 
          $match: { 
            isPaid: true, 
            orderStatus: { $ne: 'Cancelled' } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: "$totalPrice" }, 
            count: { $sum: 1 } 
          } 
        }
      ])
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); 

    const revenueGraph = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          orderStatus: { $ne: 'Cancelled' },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" } 
          },
          total: { $sum: "$totalPrice" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const revenue = paidOrdersData.length > 0 ? paidOrdersData[0].totalRevenue : 0;
    const paidOrdersCount = paidOrdersData.length > 0 ? paidOrdersData[0].count : 0;

    const statusBreakdown: any = {
      Processing: 0,
      Confirmed: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0
    };

    orderStats.forEach(stat => {
      if (statusBreakdown.hasOwnProperty(stat._id)) {
        statusBreakdown[stat._id] = stat.count;
      }
    });


    res.json({
      success: true,
      stats: {
        totalRevenue: Math.round(revenue * 100) / 100,
        paidOrdersCount,
        totalOrders,
        totalProducts,
        totalUsers,
        totalAdmins,
        totalCategories,
        pendingOrders: statusBreakdown.Processing,
        statusBreakdown,
        revenueGraph 
      }
    });

  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};