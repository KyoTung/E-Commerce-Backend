const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {
  addToCart,
  getUserCart,
  deleteCart,
  applyCoupon,
  updateCartItem,
  removeCartItem} = require("../controller/cartController")



router.post("/", authMiddleware, addToCart);
router.post("/apply-coupon", authMiddleware, applyCoupon);
router.get("/", authMiddleware, getUserCart);
router.put("/", authMiddleware, updateCartItem)
router.delete("/",authMiddleware, deleteCart)
router.delete("/cart-item", authMiddleware, removeCartItem);

module.exports = router;