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
// const getRevenueChart = asyncHandler(async (req, res) => {
//   const { period = 'day', range = 7, startDate: customStart, endDate: customEnd } = req.query;
//   let startDate, endDate = new Date();
//   endDate.setHours(23, 59, 59, 999);

//   if (customStart && customStart !== 'undefined' && customEnd && customEnd !== 'undefined') {
//     startDate = new Date(customStart);
//     endDate = new Date(customEnd);
//     if (isNaN(startDate) || isNaN(endDate)) {
//       startDate = new Date();
//       startDate.setDate(startDate.getDate() - 7);
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date();
//       endDate.setHours(23, 59, 59, 999);
//     } else {
//       startDate.setHours(0, 0, 0, 0);
//       endDate.setHours(23, 59, 59, 999);
//     }
//   } else {
//     startDate = new Date();
//     if (period === 'day') {
//       startDate.setDate(startDate.getDate() - (parseInt(range) - 1));
//       startDate.setHours(0, 0, 0, 0);
//     } else if (period === 'week') {
//       startDate.setDate(startDate.getDate() - (parseInt(range) * 7));
//       startDate.setHours(0, 0, 0, 0);
//     } else if (period === 'month') {
//       startDate.setMonth(startDate.getMonth() - parseInt(range));
//       startDate.setHours(0, 0, 0, 0);
//     } else {
//       startDate = new Date(0);
//     }
//   }

//   const match = revenueMatchStage(startDate, endDate);
//   let groupId;
//   if (period === 'day') {
//     groupId = {
//       $dateToString: {
//         format: '%Y-%m-%d',
//         date: '$createdAt',
//         timezone: "Asia/Ho_Chi_Minh"
//       }
//     };
//   } else if (period === 'week') {
//     groupId = {
//       $dateToString: {
//         format: '%Y-%V',
//         date: '$createdAt',
//         timezone: "Asia/Ho_Chi_Minh"
//       }
//     };
//   } else {
//     groupId = {
//       $dateToString: {
//         format: '%Y-%m',
//         date: '$createdAt',
//         timezone: "Asia/Ho_Chi_Minh"
//       }
//     };
//   }

//   const revenueData = await Order.aggregate([
//     { $match: match },
//     {
//       $group: {
//         _id: groupId,
//         revenue: { $sum: '$total' },
//         orders: { $sum: 1 }
//       }
//     },
//     { $sort: { _id: 1 } }
//   ]);

//   res.json({ data: revenueData, period, startDate, endDate });
// });

// ====================== 2. Doanh thu theo biểu đồ (linh hoạt theo yêu cầu: ngày, tháng trong năm, năm) ======================
const getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'day', range = 7, startDate: customStart, endDate: customEnd } = req.query;
  
  // Xác định khoảng thời gian dựa trên period và range
  let startDate, endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  // Nếu có custom date thì ưu tiên dùng (ít dùng)
  if (customStart && customStart !== 'undefined' && customEnd && customEnd !== 'undefined') {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    if (isNaN(startDate) || isNaN(endDate)) {
      // fallback
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }
  } else {
    // Tự động tính startDate dựa trên period và range
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (period) {
      case 'day':   // 7 ngày gần nhất (tính cả hôm nay)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (parseInt(range) - 1));
        break;
      case 'month': // Các tháng trong năm hiện tại (từ tháng 1 đến tháng hiện tại)
        startDate = new Date(now.getFullYear(), 0, 1); // 1 tháng 1 năm nay
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':  // Tất cả các năm có đơn hàng (không giới hạn, hoặc lấy 5 năm gần nhất)
        startDate = new Date(0); // từ đầu kỷ nguyên
        break;
      default:
        startDate = new Date(0);
    }
  }

  // Điều kiện lọc doanh thu (paid hoặc COD)
  const match = {
    $or: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod' }],
    createdAt: { $gte: startDate, $lte: endDate }
  };

  let groupId;
  if (period === 'day') {
    groupId = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$createdAt',
        timezone: "Asia/Ho_Chi_Minh"
      }
    };
  } else if (period === 'month') {
    // Nhóm theo tháng (YYYY-MM)
    groupId = {
      $dateToString: {
        format: '%Y-%m',
        date: '$createdAt',
        timezone: "Asia/Ho_Chi_Minh"
      }
    };
  } else { // year
    groupId = { $year: { date: '$createdAt', timezone: "Asia/Ho_Chi_Minh" } };
  }

  let revenueData = await Order.aggregate([
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

  // Đối với period = 'day', cần đảm bảo đủ các ngày trong khoảng (kể cả ngày không có doanh thu)
  if (period === 'day') {
    const dayList = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      dayList.push(key);
      current.setDate(current.getDate() + 1);
    }
    revenueData = dayList.map(key => {
      const found = revenueData.find(item => item._id === key);
      return {
        _id: key,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0
      };
    });
  }
  // Đối với period = 'month', đảm bảo đủ các tháng từ tháng 1 đến tháng hiện tại
  else if (period === 'month') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const monthList = [];
    for (let m = 1; m <= currentMonth; m++) {
      const key = `${currentYear}-${String(m).padStart(2, '0')}`;
      monthList.push(key);
    }
    revenueData = monthList.map(key => {
      const found = revenueData.find(item => item._id === key);
      return {
        _id: key,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0
      };
    });
  }
  // Đối với period = 'year', giữ nguyên, nhưng nếu muốn đủ các năm có dữ liệu thì không cần fill

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

// statsController.js
const getProfitStats = asyncHandler(async (req, res) => {
  const { period = 'all', startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = getDateRange(period, customStart, customEnd);

  const match = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  // Tổng doanh thu (chỉ tính đơn đã thanh toán hoặc COD)
  const revenueMatch = {
    ...match,
    $or: [
      { paymentStatus: 'paid' },
      { paymentMethod: 'cod' }
    ]
  };
  const revenueResult = await Order.aggregate([
    { $match: revenueMatch },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;

  // Tổng giảm giá (tất cả đơn)
  const discountResult = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$discountAmount' } } }
  ]);
  const totalDiscount = discountResult[0]?.total || 0;

  // Tổng phí vận chuyển
  const shippingResult = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$shippingFee' } } }
  ]);
  const totalShipping = shippingResult[0]?.total || 0;

  // Giá vốn hàng bán (COGS) – tạm thời tính bằng 0
  // Nếu bạn có dữ liệu giá nhập, có thể tính từ InventoryTransaction
  // Ví dụ: lấy tổng giá nhập của các sản phẩm đã bán trong kỳ
  // Hiện tại, tôi để 0 để hiển thị lợi nhuận gộp (chưa trừ giá vốn)
  const totalCost = 0;

  // Lợi nhuận = Doanh thu - Giảm giá - Phí ship - Giá vốn
  const profit = totalRevenue - totalDiscount - totalShipping - totalCost;

  res.json({
    totalRevenue,
    totalDiscount,
    totalShipping,
    totalCost,
    profit
  });
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