const Order = require('../models/OrderModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const asyncHandler = require('express-async-handler');

// Helper: lấy khoảng thời gian (ngày bắt đầu, kết thúc)
const getDateRange = (period, customStart, customEnd) => {
  let startDate, endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  switch (period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default: // 'all' hoặc không có
      startDate = new Date(0);
      break;
  }
  return { startDate, endDate };
};

// @desc    Lấy tổng quan dashboard
// @route   GET /api/stats/overview
// @access  Private (Admin/Staff)
const getOverview = asyncHandler(async (req, res) => {
  const { period = 'week', startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange(period, customStart, customEnd);

  // Điều kiện lọc đơn hàng đã hoàn thành (Delivered và paid)
  const orderFilter = {
    orderStatus: 'Delivered',
    paymentStatus: 'paid',
    createdAt: { $gte: startDate, $lte: endDate }
  };

  // Tổng doanh thu
  const revenueResult = await Order.aggregate([
    { $match: orderFilter },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;

  // Tổng số đơn hàng
  const totalOrders = await Order.countDocuments(orderFilter);

  // Giá trị đơn hàng trung bình (AOV)
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Số lượng khách hàng mới
  const newCustomers = await User.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    role: 'customer'
  });

  // Số lượng sản phẩm tồn kho dưới ngưỡng (cảnh báo)
  const lowStockThreshold = parseInt(req.query.threshold) || 5;
  const lowStockProducts = await Product.aggregate([
    { $unwind: '$variants' },
    { $match: { 'variants.quantity': { $lt: lowStockThreshold, $gt: 0 } } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);
  const lowStockCount = lowStockProducts[0]?.count || 0;

  res.json({
    totalRevenue,
    totalOrders,
    averageOrderValue: aov,
    newCustomers,
    lowStockCount,
    period: { startDate, endDate }
  });
});

// @desc    Lấy doanh thu theo ngày/tuần/tháng (dữ liệu biểu đồ)
// @route   GET /api/stats/revenue
// @access  Private
const getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'day', range = 7, startDate: customStart, endDate: customEnd } = req.query;
  let startDate, endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - (parseInt(range) - 1));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - (parseInt(range) * 7));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - parseInt(range));
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(0);
    }
  }

  const matchStage = {
    orderStatus: 'Delivered',
    paymentStatus: 'paid',
    createdAt: { $gte: startDate, $lte: endDate }
  };

  let groupBy;
  let dateFormat;
  if (period === 'day') {
    groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    dateFormat = 'YYYY-MM-DD';
  } else if (period === 'week') {
    groupBy = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
    dateFormat = 'YYYY-WW';
  } else { // month
    groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    dateFormat = 'YYYY-MM';
  }

  const revenueData = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Điền các khoảng trống (nếu cần, có thể xử lý thêm)
  res.json({ data: revenueData, period, dateFormat, startDate, endDate });
});

// @desc    Top sản phẩm bán chạy (theo số lượng hoặc doanh thu)
// @route   GET /api/stats/top-products
// @access  Private
const getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 5, by = 'quantity', period = 'month', startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange(period, customStart, customEnd);

  const matchStage = {
    orderStatus: 'Delivered',
    paymentStatus: 'paid',
    createdAt: { $gte: startDate, $lte: endDate }
  };

  // Unwind products array
  const pipeline = [
    { $match: matchStage },
    { $unwind: '$products' },
    {
      $lookup: {
        from: 'products',
        localField: 'products.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $group: {
        _id: {
          productId: '$products.product',
          title: '$productInfo.title',
          image: { $arrayElemAt: ['$productInfo.images.url', 0] },
          color: '$products.color',
          storage: '$products.storage'
        },
        totalQuantity: { $sum: '$products.count' },
        totalRevenue: { $sum: { $multiply: ['$products.price', '$products.count'] } }
      }
    },
    { $sort: by === 'quantity' ? { totalQuantity: -1 } : { totalRevenue: -1 } },
    { $limit: parseInt(limit) }
  ];

  const topProducts = await Order.aggregate(pipeline);
  res.json(topProducts);
});

// @desc    Thống kê trạng thái đơn hàng (dùng cho pie chart)
// @route   GET /api/stats/order-status
// @access  Private
const getOrderStatusStats = asyncHandler(async (req, res) => {
  const { startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange('all', customStart, customEnd);

  const matchStage = { createdAt: { $gte: startDate, $lte: endDate } };
  const statusStats = await Order.aggregate([
    { $match: matchStage },
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
  ]);
  res.json(statusStats);
});

// @desc    Cảnh báo tồn kho thấp (danh sách sản phẩm)
// @route   GET /api/stats/low-stock
// @access  Private
const getLowStockList = asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 5;
  const lowStockVariants = await Product.aggregate([
    { $unwind: '$variants' },
    { $match: { 'variants.quantity': { $lt: threshold, $gte: 0 } } },
    {
      $project: {
        productTitle: '$title',
        productId: '$_id',
        color: '$variants.color',
        storage: '$variants.storage',
        quantity: '$variants.quantity',
        image: { $arrayElemAt: ['$images.url', 0] }
      }
    },
    { $sort: { quantity: 1 } }
  ]);
  res.json(lowStockVariants);
});

// @desc    Thống kê khách hàng mới theo thời gian
// @route   GET /api/stats/new-customers
// @access  Private
const getNewCustomers = asyncHandler(async (req, res) => {
  const { period = 'week', range = 4 } = req.query;
  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  if (period === 'week') {
    startDate.setDate(startDate.getDate() - (parseInt(range) * 7));
  } else if (period === 'month') {
    startDate.setMonth(startDate.getMonth() - parseInt(range));
  } else if (period === 'day') {
    startDate.setDate(startDate.getDate() - parseInt(range));
  } else {
    startDate = new Date(0);
  }

  const newCustomers = await User.aggregate([
    {
      $match: {
        role: 'customer',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          week: { $week: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  res.json(newCustomers);
});

module.exports = {
  getOverview,
  getRevenueChart,
  getTopProducts,
  getOrderStatusStats,
  getLowStockList,
  getNewCustomers
};