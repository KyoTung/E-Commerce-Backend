const express = require('express');
const { authMiddleware, isStaff } = require('../middleware/authMiddleWare');
const {
  getOverview,
  getRevenueChart,
  getTopProducts,
  getOrderStatusStats,
  getLowStockList,
  getNewCustomers,
  getRevenueByBrand,
  getRevenueByCategory
} = require('../controller/statsController');

const router = express.Router();

// Tất cả các route thống kê đều yêu cầu quyền admin hoặc staff
router.use(authMiddleware, isStaff);

router.get('/overview', getOverview);
router.get('/revenue', getRevenueChart);
router.get('/top-products', getTopProducts);
router.get('/order-status', getOrderStatusStats);
router.get('/low-stock', getLowStockList);
router.get('/new-customers', getNewCustomers);
router.get('/revenue-by-brand', getRevenueByBrand);
router.get('/revenue-by-category', getRevenueByCategory);
module.exports = router;