const express = require('express');
const { authMiddleware, isAdminOrStaff } = require('../middleware/auth');
const {
  getOverview,
  getRevenueChart,
  getTopProducts,
  getOrderStatusStats,
  getLowStockList,
  getNewCustomers
} = require('../controller/statsController');

const router = express.Router();

// Tất cả các route thống kê đều yêu cầu quyền admin hoặc staff
router.use(authMiddleware, isAdminOrStaff);

router.get('/overview', getOverview);
router.get('/revenue', getRevenueChart);
router.get('/top-products', getTopProducts);
router.get('/order-status', getOrderStatusStats);
router.get('/low-stock', getLowStockList);
router.get('/new-customers', getNewCustomers);

module.exports = router;