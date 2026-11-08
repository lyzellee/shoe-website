import Order from "../models/order.js";
import OrderInformation from "../models/orderInformation.js";
import Payment from "../models/payment.js";
import Shoe from "../models/shoe.js";

// @desc    Get Admin Dashboard Analytics & Summary
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const startOfCurrentMonth = new Date(
      currentYear,
      currentDate.getMonth(),
      1,
    );
    const startOfPreviousMonth = new Date(
      currentYear,
      currentDate.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      currentYear,
      currentDate.getMonth(),
      0,
      23,
      59,
      59,
    );

    // 1. Total Revenue, Total Orders, & Monthly Revenue Comparison
    const salesSummary = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ["$createdAt", startOfCurrentMonth] },
                "$totalAmount",
                0,
              ],
            },
          },
          prevMonthlyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", startOfPreviousMonth] },
                    { $lte: ["$createdAt", endOfPreviousMonth] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const summary = salesSummary[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      monthlyRevenue: 0,
      prevMonthlyRevenue: 0,
    };

    const monthlyGrowth =
      summary.prevMonthlyRevenue > 0
        ? (
            ((summary.monthlyRevenue - summary.prevMonthlyRevenue) /
              summary.prevMonthlyRevenue) *
            100
          ).toFixed(1)
        : 100;

    // 2. Monthly Sales Trend (Jan - Dec) para sa Bar/Line Graph
    const monthlySalesTrend = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formattedMonthlySales = monthNames.map((month, index) => {
      const found = monthlySalesTrend.find((item) => item._id === index + 1);
      return {
        month,
        sales: found ? found.totalSales : 0,
        orders: found ? found.orderCount : 0,
      };
    });

    // 3. Top 5 Best Selling Shoes (Joined sa orderinformations / shoes)
    const topShoes = await OrderInformation.aggregate([
      {
        $group: {
          _id: "$shoeId",
          totalQuantitySold: { $sum: "$quantity" },
          totalRevenueGenerated: {
            $sum: { $multiply: ["$price", "$quantity"] },
          },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "shoes",
          localField: "_id",
          foreignField: "_id",
          as: "shoeDetails",
        },
      },
      { $unwind: { path: "$shoeDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$shoeDetails.name", "Unknown Shoe"] },
          brand: "$shoeDetails.brand",
          totalQuantitySold: 1,
          totalRevenueGenerated: 1,
        },
      },
    ]);

    // 4. Order Status Breakdown (Pie Chart data)
    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Recent 5 Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "orderNumber totalAmount status createdAt paymentMethod customerName",
      );

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue: summary.totalRevenue,
        totalOrders: summary.totalOrders,
        monthlyRevenue: summary.monthlyRevenue,
        prevMonthlyRevenue: summary.prevMonthlyRevenue,
        monthlyGrowth: Number(monthlyGrowth),
      },
      analytics: {
        monthlySalesTrend: formattedMonthlySales,
        topShoes,
        statusBreakdown,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("DASHBOARD STATS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching dashboard statistics",
    });
  }
};
