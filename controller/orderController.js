const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");
const mongoose = require("mongoose")

const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, couponApplied, customerInfo } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    // Kiểm tra phương thức thanh toán
    const allowedMethods = ["cod", "bank_transfer", "momo", "vnpay", "paypal"];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // Kiểm tra thông tin người nhận
    if (!customerInfo || !customerInfo.name || !customerInfo.address || !customerInfo.phone) {
      return res.status(400).json({ error: "Missing customer information" });
    }

    const findUser = await User.findById(_id);
    const findCart = await Cart.findOne({ orderby: findUser._id }).populate('products.product');
    
    if (!findCart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    if (findCart.products.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Kiểm tra số lượng tồn kho
    for (const item of findCart.products) {
      const product = await Product.findById(item.product._id);
      if (product.quantity < item.count) {
        return res.status(400).json({ 
          error: `Insufficient stock for product: ${product.title}` 
        });
      }
    }

    let finalAmount = 0;
    if (couponApplied && findCart.totalAfterDiscount) {
      finalAmount = findCart.totalAfterDiscount;
    } else {
      finalAmount = findCart.cartTotal;
    }

    // Tạo đơn hàng mới
    const newOrder = new Order({
      products: findCart.products,
      paymentIntent: {
        id: uniqid(),
        method: paymentMethod,
        amount: finalAmount,
        currency: "VND",
        status: "pending",
      },
      orderby: findUser._id,
      paymentMethod,
      paymentStatus: "not_paid",
      total: finalAmount,
      customerInfo,
    });

    await newOrder.save();

    // Cập nhật số lượng sản phẩm đã bán
    const updates = findCart.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product._id },
        update: { 
          $inc: { 
            quantity: -item.count, 
            sold: +item.count 
          } 
        },
      },
    }));

    await Product.bulkWrite(updates);
    
    // Xóa giỏ hàng
    await Cart.deleteOne({ orderby: findUser._id });

    res.json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    
    // Phân loại lỗi để trả về thông báo phù hợp
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        error: "Validation Error", 
        details: errors 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create order", 
      details: error.message 
    });
  }
});

const getOrder = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try{
    const findUser = await User.findById(_id)
    const order = await Order.findOne({orderby: findUser._id}).populate("products.product").exec()
    res.json(order)
  } catch(error){
    throw new Error(error)
  }
});

const updateStatus = asyncHandler(async(req, res)=>{
    console.log(req.body)
})

module.exports = { createOrder, getOrder, updateStatus };
