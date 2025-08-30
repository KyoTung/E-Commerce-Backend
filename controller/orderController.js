const User = require("../models/UserModel");
const Order = require("../models/OrderModel")
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require('uniqid'); 


const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, couponApplied, customerInfo } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    // Kiểm tra phương thức thanh toán
    const allowedMethods = ["cod", "bank_transfer", "momo", "vnpay", "paypal"];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }
    // Kiểm tra thông tin người nhận
    if (
      !customerInfo ||
      !customerInfo.name ||
      !customerInfo.address ||
      !customerInfo.phone
    ) {
      throw new Error("Missing customer information");
    }

    const findUser = await User.findById(_id);
    const findCart = await Cart.findOne({ orderby: findUser._id });
    if (!findCart) throw new Error("Cart not found");

    let finalAmount = 0;
    if (couponApplied && findCart.totalAfterDiscount) {
      finalAmount = findCart.totalAfterDiscount;
    } else {
      finalAmount = findCart.cartTotal;
    }

    const newOrder = await new Order({
      products: findCart.products,
      paymentIntent: {
        id: uniqid(),
        method: paymentMethod,
        amount: finalAmount,
        currency: "VND",
        status: "pending",
      },
      orderBy: findUser._id,
      paymentMethod,
      paymentStatus: "not_paid",
      total: finalAmount,
      customerInfo,
    }).save();

    // Cập nhật số lượng sản phẩm đã bán
    const updates = findCart.products.map(item => ({
      updateOne: {
        filter: { _id: item.product._id },
        update: { $inc: { quantity: -item.count, sold: +item.count } }
      }
    }));

    await Product.bulkWrite(updates);

    res.json({
      message: "Order created successfully",
      order: newOrder
    });
  } catch (error) {
    throw new Error(error);
  }
});
module.exports ={createOrder}
