const Order = require('../models/OrderModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel');
const asyncHandler = require('express-async-handler');

// Helper: Lấy khoảng thời gian (chống undefined, 'undefined')
const getDateRange = (period, customStart, customEnd) => {
  let startDate, endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (customStart && customStart !== 'undefined' && customEnd && customEnd !== 'undefined') {
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
    default:
      startDate = new Date(0);
      break;
  }
  return { startDate, endDate };
};

// Helper: Điều kiện lọc đơn có doanh thu (paid hoặc COD)
const revenueMatchStage = (startDate, endDate) => ({
  $or: [
    { paymentStatus: 'paid' },
    { paymentMethod: 'cod' }   // viết thường theo đúng enum trong OrderModel
  ],
  createdAt: { $gte: startDate, $lte: endDate }
});

// ====================== 1. Tổng quan ======================
const getOverview = asyncHandler(async (req, res) => {
  const { period = 'week', startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange(period, customStart, customEnd);
  const match = revenueMatchStage(startDate, endDate);

  const revenueResult = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;
  const totalOrders = await Order.countDocuments(match);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const newCustomers = await User.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    role: 'user'
  });

  const lowStockThreshold = parseInt(req.query.threshold) || 5;
  const lowStockResult = await Product.aggregate([
    { $unwind: '$variants' },
    { $match: { 'variants.quantity': { $lt: lowStockThreshold, $gte: 0 } } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);
  const lowStockCount = lowStockResult[0]?.count || 0;

  res.json({
    totalRevenue,
    totalOrders,
    averageOrderValue,
    newCustomers,
    lowStockCount,
    period: { startDate, endDate }
  });
});

// ====================== 2. Doanh thu theo biểu đồ ======================
const getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'day', range = 7, startDate: customStart, endDate: customEnd } = req.query;
  let startDate, endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (customStart && customStart !== 'undefined' && customEnd && customEnd !== 'undefined') {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    if (isNaN(startDate) || isNaN(endDate)) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }
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

  const match = revenueMatchStage(startDate, endDate);
  let groupId;
  if (period === 'day') {
    groupId = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$createdAt',
        timezone: "Asia/Ho_Chi_Minh"
      }
    };
  } else if (period === 'week') {
    groupId = {
      $dateToString: {
        format: '%Y-%V',
        date: '$createdAt',
        timezone: "Asia/Ho_Chi_Minh"
      }
    };
  } else {
    groupId = {
      $dateToString: {
        format: '%Y-%m',
        date: '$createdAt',
        timezone: "Asia/Ho_Chi_Minh"
      }
    };
  }

  const revenueData = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({ data: revenueData, period, startDate, endDate });
});

// ====================== 3. Top sản phẩm bán chạy ======================
const getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 5, by = 'quantity', period = 'month', startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange(period, customStart, customEnd);
  const match = revenueMatchStage(startDate, endDate);

  const pipeline = [
    { $match: match },
    { $unwind: '$products' },
    {
      $lookup: {
        from: 'products',
        localField: 'products.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: false } },
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

// ====================== 4. Sản phẩm tồn kho thấp ======================
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

// ====================== 5. Doanh thu theo thương hiệu ======================
const getRevenueByBrand = asyncHandler(async (req, res) => {
  const { startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange('all', customStart, customEnd);
  const match = revenueMatchStage(startDate, endDate);

  const result = await Order.aggregate([
    { $match: match },
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
        _id: '$productInfo.brand',
        revenue: { $sum: { $multiply: ['$products.price', '$products.count'] } },
        quantity: { $sum: '$products.count' }
      }
    },
    { $sort: { revenue: -1 } }
  ]);
  res.json(result);
});

// ====================== 6. Doanh thu theo danh mục ======================
const getRevenueByCategory = asyncHandler(async (req, res) => {
  const { startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange('all', customStart, customEnd);
  const match = revenueMatchStage(startDate, endDate);

  const result = await Order.aggregate([
    { $match: match },
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
        _id: '$productInfo.category',
        revenue: { $sum: { $multiply: ['$products.price', '$products.count'] } },
        quantity: { $sum: '$products.count' }
      }
    },
    { $sort: { revenue: -1 } }
  ]);
  res.json(result);
});

// ====================== 7. Thống kê trạng thái đơn hàng ======================
const getOrderStatusStats = asyncHandler(async (req, res) => {
  const { startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange('all', customStart, customEnd);
  const match = { createdAt: { $gte: startDate, $lte: endDate } };
  const statusStats = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
  ]);
  res.json(statusStats);
});

// ====================== 8. Thống kê khách hàng mới ======================
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
        role: 'user',
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
  getNewCustomers,
  getRevenueByBrand,
  getRevenueByCategory
};