const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");
const mongoose = require("mongoose");

// ========================= ADD TO CART =========================
const addToCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const findUser = await User.findById(_id);
    let existingCart = await Cart.findOne({ orderby: findUser._id });

    let processedCartItems = [];
    let cartTotal = 0;

    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      const product = await Product.findById(item._id);

      if (!product) {
        return res
          .status(404)
          .json({ message: `Không tìm thấy sản phẩm ID: ${item._id}` });
      }

      // 🔒 KIỂM TRA SẢN PHẨM CÒN KINH DOANH
      if (!product.isActive) {
        return res.status(400).json({
          message: `Sản phẩm "${product.title}" đã ngừng kinh doanh, không thể thêm vào giỏ hàng.`,
        });
      }

      const variant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage
      );

      if (!variant) {
        return res.status(400).json({
          message: `Phiên bản ${item.storage} - ${item.color} không tồn tại cho sản phẩm này`,
        });
      }

      const availableStock =
        variant.quantity !== undefined ? variant.quantity : product.quantity;

      let currentQtyInCart = 0;
      if (existingCart) {
        const foundInCart = existingCart.products.find(
          (p) =>
            p.product.toString() === item._id &&
            p.color === item.color &&
            p.storage === item.storage
        );
        if (foundInCart) currentQtyInCart = foundInCart.count;
      }

      if (currentQtyInCart + item.count > availableStock) {
        return res.status(400).json({
          message: `Sản phẩm "${product.title}" (${item.storage}-${item.color}) không đủ hàng. Còn lại: ${availableStock}`,
        });
      }

      processedCartItems.push({
        product: item._id,
        count: item.count,
        color: item.color,
        storage: item.storage,
        price: variant.price,
      });
    }

    if (!existingCart) {
      const total = processedCartItems.reduce(
        (sum, item) => sum + item.price * item.count,
        0
      );
      const newCart = await new Cart({
        products: processedCartItems,
        orderby: findUser._id,
        cartTotal: total,
      }).save();
      return res.json(newCart);
    }

    for (let i = 0; i < processedCartItems.length; i++) {
      const incomingItem = processedCartItems[i];
      const existingItemIndex = existingCart.products.findIndex(
        (p) =>
          p.product.toString() === incomingItem.product &&
          p.color === incomingItem.color &&
          p.storage === incomingItem.storage
      );

      if (existingItemIndex > -1) {
        existingCart.products[existingItemIndex].count += incomingItem.count;
        existingCart.products[existingItemIndex].price = incomingItem.price;
      } else {
        existingCart.products.push(incomingItem);
      }
    }

    existingCart.cartTotal = existingCart.products.reduce(
      (total, item) => total + item.price * item.count,
      0
    );
    await existingCart.save();
    res.json(existingCart);
  } catch (error) {
    throw new Error(error);
  }
});

// ========================= GET USER CART =========================
const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const findCart = await Cart.findOne({ orderby: _id }).populate(
      "products.product",
      "_id title price images totalAfterDiscount"
    );
    res.json(findCart);
  } catch (error) {
    throw new Error(error);
  }
});

// ========================= DELETE CART =========================
const deleteCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const findUser = await User.findOne({ _id });
    const deleteCart = await Cart.findOneAndDelete({ orderby: findUser._id });
    res.json({
      message: "Product removed from cart successfully",
      cart: deleteCart,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// ========================= APPLY COUPON =========================
const applyCoupon = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  const { coupon, selectedItems } = req.body;

  const validateCoupon = await Coupon.findOne({ name: coupon });
  if (!validateCoupon) {
    throw new Error("Mã giảm giá không hợp lệ hoặc đã hết hạn");
  }

  const findUser = await User.findOne({ _id });
  const cart = await Cart.findOne({ orderby: findUser._id }).populate(
    "products.product"
  );
  if (!cart) throw new Error("Không tìm thấy giỏ hàng");

  let calculateTotal = 0;

  if (selectedItems && selectedItems.length > 0) {
    selectedItems.forEach((selectedItem) => {
      const cartItem = cart.products.find(
        (item) =>
          item.product._id.toString() === selectedItem.productId &&
          item.color === selectedItem.color &&
          item.storage === selectedItem.storage
      );
      if (cartItem) {
        calculateTotal += cartItem.price * cartItem.count;
      }
    });
  } else {
    calculateTotal = cart.cartTotal;
  }

  if (calculateTotal === 0) {
    throw new Error("Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá");
  }

  let totalAfterDiscount = (
    calculateTotal -
    (calculateTotal * validateCoupon.discount) / 100
  ).toFixed(2);

  const updatedCart = await Cart.findOneAndUpdate(
    { orderby: findUser._id },
    { $set: { totalAfterDiscount: totalAfterDiscount } },
    { new: true }
  );

  res.json({
    totalBeforeDiscount: calculateTotal,
    totalAfterDiscount: updatedCart.totalAfterDiscount,
    discountAmount: (calculateTotal - updatedCart.totalAfterDiscount).toFixed(2),
  });
});

// ========================= UPDATE CART ITEM =========================
const updateCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { productId, color, count, storage, action } = req.body;
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  let productIndex = cart.products.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.color === color &&
      item.storage === storage
  );
  if (productIndex === -1) throw new Error("Product not in cart");

  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  const variant = product.variants.find(
    (v) => v.color === color && v.storage === storage
  );
  if (!variant) throw new Error("Variant not found");

  const currentItem = cart.products[productIndex];
  let newCount = currentItem.count;

  // Xác định số lượng mới
  if (action === "increment") {
    newCount += count;
  } else if (action === "decrement") {
    newCount -= count;
  } else {
    // Nếu không có action, gán trực tiếp (thường là set số lượng tuyệt đối)
    newCount = count;
  }

  // Nếu là tăng số lượng (increment hoặc newCount > currentItem.count) thì kiểm tra
  if (newCount > currentItem.count) {
    // 🔒 KIỂM TRA SẢN PHẨM CÒN KINH DOANH
    if (!product.isActive) {
      return res.status(400).json({
        message: `Sản phẩm "${product.title}" đã ngừng kinh doanh, không thể tăng số lượng.`,
      });
    }

    // 🔒 KIỂM TRA TỒN KHO
    if (newCount > variant.quantity) {
      return res.status(400).json({
        message: `Sản phẩm "${product.title}" (${storage}-${color}) không đủ hàng. Còn lại: ${variant.quantity}`,
      });
    }
  }

  // Cập nhật số lượng
  cart.products[productIndex].count = newCount;

  // Xóa nếu số lượng <= 0
  if (cart.products[productIndex].count <= 0) {
    cart.products.splice(productIndex, 1);
  }

  // Nếu giỏ hàng trống thì xóa cart
  if (cart.products.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return res.json({
      message: "Cart item updated - cart is now empty and was deleted",
      cart: null,
    });
  }

  // Tính lại tổng tiền
  cart.cartTotal = cart.products.reduce(
    (total, item) => total + item.price * item.count,
    0
  );
  cart.totalAfterDiscount = undefined;
  await cart.save();
  res.json({ message: "Cart updated", cart });
});

// ========================= REMOVE CART ITEM =========================
const removeCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { productId, color, storage } = req.body;
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  const initialLength = cart.products.length;
  cart.products = cart.products.filter(
    (item) =>
      !(
        item.product.toString() === productId &&
        item.color === color &&
        item.storage === storage
      )
  );
  if (initialLength === cart.products.length) {
    throw new Error("Product with specified color not found in cart");
  }

  if (cart.products.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return res.json({
      message: "Product removed - cart is now empty and was deleted",
      cart: null,
    });
  }

  cart.cartTotal = cart.products.reduce(
    (total, item) => total + item.price * item.count,
    0
  );
  cart.totalAfterDiscount = undefined;
  await cart.save();
  res.json({ message: "Product removed from cart", cart });
});

module.exports = {
  addToCart,
  getUserCart,
  deleteCart,
  applyCoupon,
  updateCartItem,
  removeCartItem,
};