import Order from "../models/order.js";
import OrderInformation from "../models/orderInformation.js";
import Shoe from "../models/shoe.js";

const TIMEZONE = "Asia/Manila";

// @desc    Get Admin Dashboard Analytics & Summary
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();

    const startOfCurrentMonth = new Date(year, now.getMonth(), 1);
    const startOfPreviousMonth = new Date(year, now.getMonth() - 1, 1);
    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    // Revenue only counts orders that are not cancelled AND already paid.
    const paidMatch = {
      orderStatus: { $ne: "cancelled" },
      paymentStatus: "completed",
    };
    const isPaid = { $eq: ["$paymentStatus", "completed"] };

    // 1. Totals + this month vs last month
    const [summaryRow] = await Order.aggregate([
      { $match: { orderStatus: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          paidOrders: { $sum: { $cond: [isPaid, 1, 0] } },
          totalRevenue: { $sum: { $cond: [isPaid, "$totalPrice", 0] } },
          monthlyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [isPaid, { $gte: ["$orderDate", startOfCurrentMonth] }],
                },
                "$totalPrice",
                0,
              ],
            },
          },
          prevMonthlyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    isPaid,
                    { $gte: ["$orderDate", startOfPreviousMonth] },
                    { $lt: ["$orderDate", startOfCurrentMonth] },
                  ],
                },
                "$totalPrice",
                0,
              ],
            },
          },
        },
      },
    ]);

    const summary = summaryRow || {
      totalOrders: 0,
      paidOrders: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      prevMonthlyRevenue: 0,
    };

    let monthlyGrowth = 0;
    if (summary.prevMonthlyRevenue > 0) {
      monthlyGrowth = Number(
        (
          ((summary.monthlyRevenue - summary.prevMonthlyRevenue) /
            summary.prevMonthlyRevenue) *
          100
        ).toFixed(1),
      );
    } else if (summary.monthlyRevenue > 0) {
      monthlyGrowth = 100;
    }

    // 2. Monthly sales trend (Jan - Dec of the current year)
    const monthlyTrend = await Order.aggregate([
      {
        $match: {
          ...paidMatch,
          orderDate: { $gte: startOfYear, $lt: startOfNextYear },
        },
      },
      {
        $group: {
          _id: { $month: { date: "$orderDate", timezone: TIMEZONE } },
          totalSales: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
        },
      },
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

    const monthlySalesTrend = monthNames.map((month, index) => {
      const found = monthlyTrend.find((m) => m._id === index + 1);
      return {
        month,
        sales: found ? found.totalSales : 0,
        orders: found ? found.orderCount : 0,
      };
    });

    // 3. Top 5 best-selling shoes (items live inside each order)
    const topShoes = await Order.aggregate([
      { $match: paidMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.shoeId",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenueGenerated: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { totalQuantitySold: -1, totalRevenueGenerated: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Shoe.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "shoe",
        },
      },
      { $unwind: { path: "$shoe", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$shoe.name", "Deleted shoe"] },
          brand: "$shoe.brand",
          totalQuantitySold: 1,
          totalRevenueGenerated: 1,
        },
      },
    ]);

    // 4. Order status breakdown (donut chart)
    const statusBreakdown = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 5. Recent 5 orders (+ customer name from order information)
    const latestOrders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(5)
      .lean();

    const customers = await OrderInformation.find({
      orderId: { $in: latestOrders.map((o) => o._id) },
    })
      .select("orderId firstName lastName")
      .lean();

    const customerByOrder = new Map(
      customers.map((c) => [
        String(c.orderId),
        `${c.firstName} ${c.lastName}`.trim(),
      ]),
    );

    // Keep the field names the Dashboard.jsx already expects
    const recentOrders = latestOrders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderReference,
      customerName: customerByOrder.get(String(o._id)) || "Guest",
      totalAmount: o.totalPrice,
      status: o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.orderDate,
    }));

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue: summary.totalRevenue,
        totalOrders: summary.totalOrders,
        paidOrders: summary.paidOrders,
        monthlyRevenue: summary.monthlyRevenue,
        prevMonthlyRevenue: summary.prevMonthlyRevenue,
        monthlyGrowth,
      },
      analytics: {
        monthlySalesTrend,
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
