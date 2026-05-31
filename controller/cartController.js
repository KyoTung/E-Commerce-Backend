const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");
const mongoose = require("mongoose");

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

      const variant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage
      );

      if (!variant) {
        return res.status(400).json({
          message: `Phiên bản ${item.storage} - ${item.color} không tồn tại cho sản phẩm này`,
        });
      }

      // KIỂM TRA TỒN KHO (Check theo variant quantity0
      const availableStock =
        variant.quantity !== undefined ? variant.quantity : product.quantity;

      // Tính tổng số lượng user muốn mua
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

      // Đẩy vào mảng đã xử lý với giá chuẩn từ DB
      processedCartItems.push({
        product: item._id,
        count: item.count,
        color: item.color,
        storage: item.storage,
        price: variant.price,
      });
    }

    // TRƯỜNG HỢP A: Chưa có giỏ hàng -> Tạo mới
    if (!existingCart) {
      // Tính tổng tiền
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

    // TRƯỜNG HỢP B: Đã có giỏ hàng -> Update / Push
    for (let i = 0; i < processedCartItems.length; i++) {
      const incomingItem = processedCartItems[i];

      // Tìm xem sản phẩm này và biến thể (color, storage) đã có trong giỏ chưa
      const existingItemIndex = existingCart.products.findIndex(
        (p) =>
          p.product.toString() === incomingItem.product &&
          p.color === incomingItem.color &&
          p.storage === incomingItem.storage // So sánh cả color và storage
      );

      if (existingItemIndex > -1) {
        // Nếu có rồi: Cộng dồn số lượng và cập nhật giá mới nhất
        existingCart.products[existingItemIndex].count += incomingItem.count;
        existingCart.products[existingItemIndex].price = incomingItem.price;
      } else {
        // Nếu chưa có: Push vào mảng products
        existingCart.products.push(incomingItem);
      }
    }

    // Tính lại tổng tiền giỏ hàng
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

const deleteCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const findUser = await User.findOne({ _id });
    console.log("_id from req.user:", _id);
    console.log("findUser._id:", findUser._id);

    const deleteCart = await Cart.findOneAndDelete({ orderby: findUser._id });
    res.json({
      message: "Product removed from cart successfully",
      cart: deleteCart,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// const applyCoupon = asyncHandler(async (req, res) => {
//   const { _id } = req.user;
//   validateMongoDbId(_id);
//   const { coupon } = req.body;
//   const validateCoupon = await Coupon.findOne({ name: coupon });
//   if (!validateCoupon) {
//     throw new Error("Invalid coupon");
//   }
//   const findUser = await User.findOne({ _id });
//   const cart = await Cart.findOne({ orderby: findUser._id }).populate(
//     "products.product"
//   );
//   if (!cart) throw new Error("Cart not found");

//   let { cartTotal } = cart;
//   let totalAfterDiscount = (
//     cartTotal -
//     (cartTotal * validateCoupon.discount) / 100
//   ).toFixed(2);

//   // Cập nhật lại cart
//   const updatedCart = await Cart.findOneAndUpdate(
//     { orderby: findUser._id },
//     { $set: { totalAfterDiscount: totalAfterDiscount } },
//     { new: true }
//   );

//   res.json({ totalAfterDiscount: updatedCart.totalAfterDiscount });
// });

const applyCoupon = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  
  // Nhận thêm mảng selectedItems từ frontend
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

  // TÍNH TOÁN LẠI TỔNG TIỀN DỰA TRÊN SẢN PHẨM ĐƯỢC CHỌN (Bảo mật: Lấy giá từ DB)
  if (selectedItems && selectedItems.length > 0) {
    selectedItems.forEach((selectedItem) => {
      const cartItem = cart.products.find(
        (item) => 
          item.product._id.toString() === selectedItem.productId &&
          item.color === selectedItem.color &&
          item.storage === selectedItem.storage
      );

      if (cartItem) {
        // Lấy giá và số lượng từ Database, bỏ qua dữ liệu giá từ Frontend
        calculateTotal += cartItem.price * cartItem.count;
      }
    });
  } else {
    // Fallback: Nếu không truyền gì, mặc định tính cho toàn bộ giỏ hàng
    calculateTotal = cart.cartTotal;
  }

  if (calculateTotal === 0) {
      throw new Error("Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá");
  }

  // Tính toán số tiền sau khi giảm
  let totalAfterDiscount = (
    calculateTotal -
    (calculateTotal * validateCoupon.discount) / 100
  ).toFixed(2);

  // Cập nhật lại cart
  // Lưu ý: Việc lưu totalAfterDiscount vào DB lúc này mang tính chất tạm thời cho phiên thanh toán hiện tại.
  const updatedCart = await Cart.findOneAndUpdate(
    { orderby: findUser._id },
    { $set: { totalAfterDiscount: totalAfterDiscount } },
    { new: true }
  );

  // Trả về chi tiết để Frontend dễ hiển thị
  res.json({ 
      totalBeforeDiscount: calculateTotal,
      totalAfterDiscount: updatedCart.totalAfterDiscount,
      discountAmount: (calculateTotal - updatedCart.totalAfterDiscount).toFixed(2)
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { productId, color, count, storage, action } = req.body;
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  const countNum = Number(count);
  if (isNaN(countNum)) {
    throw new Error("Count must be a number");
  }

  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  let productIndex = cart.products.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.color === color &&
      item.storage === storage
  );

  if (productIndex === -1) throw new Error("Product not in cart");

  // Xử lý cập nhật số lượng dựa trên action
  if (action === "increment" || action === "decrement") {
    // Cập nhật số lượng tương đối
    cart.products[productIndex].count +=
      action === "increment" ? countNum : -countNum;
  } else {
    // Mặc định: gán giá trị tuyệt đối
    cart.products[productIndex].count = countNum;
  }

  // Kiểm tra nếu count <= 0 thì xóa sản phẩm
  if (cart.products[productIndex].count <= 0) {
    cart.products.splice(productIndex, 1);
  }

  // Kiểm tra nếu giỏ hàng trống sau khi cập nhật
  if (cart.products.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return res.json({
      message: "Cart item updated - cart is now empty and was deleted",
      cart: null,
    });
  }

  // Tính lại tổng giỏ hàng nếu vẫn còn sản phẩm
  cart.cartTotal = cart.products.reduce(
    (total, item) => total + item.price * item.count,
    0
  );
  cart.totalAfterDiscount = undefined;
  await cart.save();
  res.json({ message: "Cart updated", cart });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { productId, color, storage } = req.body;
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  // Find user's cart
  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  // Remove product with matching productId AND color AND storage
  const initialLength = cart.products.length;
  cart.products = cart.products.filter(
    (item) =>
      !(
        (
          item.product.toString() === productId &&
          item.color === color &&
          item.storage === storage
        ) 
      )
  );
  if (initialLength === cart.products.length) {
    throw new Error("Product with specified color not found in cart");
  }

  // Check if cart is empty after removal
  if (cart.products.length === 0) {
    // SỬA Ở ĐÂY: Dùng cart._id thay vì cart.productId
    await Cart.findByIdAndDelete(cart._id);
    return res.json({
      message: "Product removed - cart is now empty and was deleted",
      cart: null,
    });
  }

  // Recalculate cart total if cart still has products
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
