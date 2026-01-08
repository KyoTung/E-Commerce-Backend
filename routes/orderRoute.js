const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createOrder, getOrderUser, updateStatus, getAllOrders, getOrderDetail, cancelOrder, deleteOrder} = require("../controller/orderController")
const { newPayment, callback , simulateSuccess} = require("../controller/paymentController");

// ZaloPay Routes
router.post("/zalopay", authMiddleware, newPayment);
router.post("/zalopay_callback", callback);
router.put("/simulate-success", authMiddleware, simulateSuccess);

router.post("/", authMiddleware, createOrder);
router.get("/user-orders", authMiddleware, getOrderUser);
router.get("/order-detail/:id",authMiddleware, getOrderDetail)
router.put("/:id",authMiddleware, isAdmin,updateStatus )
router.put("/cancel-order/:id",authMiddleware,cancelOrder )
router.get("/", authMiddleware, isAdmin, getAllOrders);
router.delete("/:id", authMiddleware, deleteOrder);


module.exports = router;