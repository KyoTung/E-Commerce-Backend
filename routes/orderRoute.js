const express = require("express");
const {
  isAdmin,
  authMiddleware,
  isStaff,
} = require("../middleware/authMiddleWare");

const router = express.Router();
const {
  createOrder,
  getOrderUser,
  updateStatus,
  getAllOrders,
  getOrderDetail,
  cancelOrder,
  deleteOrder,
  checkCouponCheckout,
  adminCreateOrder,
  updateImei,
  getOrderByImei,
} = require("../controller/orderController");
const {
  newPayment,
  callback,
  simulateSuccess,
} = require("../controller/paymentController");

// ZaloPay Routes
router.post("/zalopay", authMiddleware, newPayment);
router.post("/zalopay_callback", callback);
router.put("/simulate-success", authMiddleware, simulateSuccess);

router.post("/", authMiddleware, createOrder);
router.post("/admin-create", authMiddleware, isStaff, adminCreateOrder);
router.get("/user-orders", authMiddleware, getOrderUser);
router.get("/order-detail/:id", authMiddleware, getOrderDetail);
router.post("/checkout/coupon", authMiddleware, checkCouponCheckout);
router.put("/:id", authMiddleware, isStaff, updateStatus);
router.put("/update-imei/:id", authMiddleware, isStaff, updateImei);
router.put("/cancel-order/:id", authMiddleware, cancelOrder);
router.get("/imei-detail/:id", authMiddleware, getOrderByImei);
router.get("/", authMiddleware, isStaff, getAllOrders);
router.delete("/:id", authMiddleware, isAdmin, deleteOrder);

module.exports = router;
