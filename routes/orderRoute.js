const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createOrder, getOrderUser, updateStatus, getAllOrders, getOrderDetailAdmin} = require("../controller/orderController")


router.post("/", authMiddleware, createOrder);
router.get("/user-orders", authMiddleware, getOrderUser);
router.get("/order-detail/:id",authMiddleware, getOrderDetailAdmin )
router.put("/:id",authMiddleware, isAdmin,updateStatus )
router.get("/", authMiddleware, isAdmin, getAllOrders);

module.exports = router;