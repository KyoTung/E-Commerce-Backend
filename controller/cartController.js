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
  // Lấy dữ liệu giỏ hàng từ body request
  const { cart } = req.body;
  // Lấy ID user từ object req.user (do middleware auth gán)
  const { _id } = req.user;
  // Kiểm tra ID user có hợp lệ không (phải là ObjectId hợp lệ)
  validateMongoDbId(_id);

  try {
    // Tìm user hiện tại trong database
    const findUser = await User.findById(_id);
    // Tìm giỏ hàng hiện tại của user (nếu có)
    let existingCart = await Cart.findOne({ orderby: findUser._id });

    // KIỂM TRA TỒN KHO: Xác minh tất cả sản phẩm có đủ số lượng trước khi xử lý
    for (let i = 0; i < cart.length; i++) {
      // Lấy thông tin sản phẩm từ database
      const product = await Product.findById(cart[i]._id);
      
      // Kiểm tra sản phẩm có tồn tại không
      if (!product) {
        return res.status(404).json({ 
          error: `Không tìm thấy sản phẩm: ${cart[i]._id}` 
        });
      }
      
      // Tính tổng số lượng sản phẩm sẽ có trong giỏ hàng
      let totalQuantity = cart[i].count;
      
      // Nếu đã có giỏ hàng, kiểm tra xem sản phẩm đã có trong giỏ chưa
      if (existingCart) {
        const existingProduct = existingCart.products.find(
          p => p.product.toString() === cart[i]._id && p.color === cart[i].color
        );
        
        // Nếu sản phẩm đã có trong giỏ, cộng thêm số lượng hiện có
        if (existingProduct) {
          totalQuantity += existingProduct.count;
        }
      }
      
      // Kiểm tra số lượng tồn kho có đáp ứng được nhu cầu không
      if (totalQuantity > product.quantity) {
        return res.status(400).json({ 
          error: `Sản phẩm "${product.title}" không đủ số lượng. Hiện có: ${product.quantity}, Bạn yêu cầu: ${totalQuantity}` 
        });
      }
    }

    // TRƯỜNG HỢP 1: Người dùng chưa có giỏ hàng, tạo giỏ hàng mới
    if (!existingCart) {
      let products = [];
      let cartTotal = 0;

      // Duyệt qua từng sản phẩm trong mảng cart gửi lên từ frontend
      for (let i = 0; i < cart.length; i++) {
        let object = {};
        object.product = cart[i]._id; // Lưu id sản phẩm
        object.count = cart[i].count; // Lưu số lượng mua
        object.color = cart[i].color; // Lưu màu sản phẩm nếu có

        // Lấy giá sản phẩm từ database
        let getPrice = await Product.findById(cart[i]._id)
          .select("price")
          .exec();
        object.price = getPrice ? getPrice.price : 0; // Nếu không tìm thấy thì gán 0

        products.push(object); // Thêm object vào mảng products
        cartTotal += object.price * object.count; // Cộng dồn tổng tiền cart
      }

      // Tạo cart mới với các sản phẩm và tổng tiền vừa tính
      const newCart = await new Cart({
        products,
        orderby: findUser._id,
        cartTotal,
      }).save();
      
      // Trả về cart vừa tạo
      return res.json({
        success: true,
        message: "Thêm vào giỏ hàng thành công",
        cart: newCart
      });
    }

    // TRƯỜNG HỢP 2: Người dùng đã có giỏ hàng, cập nhật giỏ hàng hiện có
    for (let i = 0; i < cart.length; i++) {
      const incomingItem = cart[i];
      
      // Kiểm tra sản phẩm này đã có trong cart chưa (so sánh theo id & color)
      const existingProductIndex = existingCart.products.findIndex(
        (p) =>
          p.product.toString() === incomingItem._id &&
          p.color === incomingItem.color
      );

      // Lấy giá mới nhất của sản phẩm từ DB
      let productPrice = await Product.findById(incomingItem._id)
        .select("price")
        .exec();
      productPrice = productPrice ? productPrice.price : 0;

      if (existingProductIndex > -1) {
        // Nếu sản phẩm đã có trong cart, cộng thêm số lượng
        existingCart.products[existingProductIndex].count += incomingItem.count;
        // Cập nhật giá mới nhất cho sản phẩm đó
        existingCart.products[existingProductIndex].price = productPrice;
      } else {
        // Nếu chưa có, thêm sản phẩm mới vào cart
        existingCart.products.push({
          product: incomingItem._id,
          count: incomingItem.count,
          color: incomingItem.color,
          price: productPrice,
        });
      }
    }

    // Tính lại tổng tiền cart sau khi đã merge các sản phẩm
    existingCart.cartTotal = existingCart.products.reduce(
      (total, item) => total + item.price * item.count,
      0
    );

    // Lưu lại cart đã cập nhật
    const updatedCart = await existingCart.save();
    
    // Trả về cart đã cập nhật
    res.json({
      success: true,
      message: "Cập nhật giỏ hàng thành công",
      cart: updatedCart
    });
  } catch (error) {
    // Ghi log lỗi chi tiết để debug
    console.error('Lỗi thêm vào giỏ hàng:', error);
    
    // Trả về lỗi cho client
    res.status(500).json({ 
      success: false,
      error: "Thêm vào giỏ hàng thất bại", 
      details: error.message 
    });
  }
});

const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const findCart = await Cart.findOne({ orderby: _id }).populate(
      "products.product",
      "_id title price totalAfterDiscount"
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

const applyCoupon = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  const { coupon } = req.body;
  const validateCoupon = await Coupon.findOne({ name: coupon });
  if (!validateCoupon) {
    throw new Error("Invalid coupon");
  }
  const findUser = await User.findOne({ _id });
  const cart = await Cart.findOne({ orderby: findUser._id }).populate(
    "products.product"
  );
  if (!cart) throw new Error("Cart not found");

  let { cartTotal } = cart;
  let totalAfterDiscount = (
    cartTotal -
    (cartTotal * validateCoupon.discount) / 100
  ).toFixed(2);

  // Cập nhật lại cart
  const updatedCart = await Cart.findOneAndUpdate(
    { orderby: findUser._id },
    { $set: { totalAfterDiscount: totalAfterDiscount } },
    { new: true }
  );

  res.json({ totalAfterDiscount: updatedCart.totalAfterDiscount });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { productId, color, count, action } = req.body; // Thêm trường 'action' để xác định hành động
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  // Validate và chuyển đổi count thành số
  const countNum = Number(count);
  if (isNaN(countNum)) {
    throw new Error("Count must be a number");
  }

  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  // Tìm sản phẩm để cập nhật (theo productId và color)
  let productIndex = cart.products.findIndex(
    (item) => item.product.toString() === productId && item.color === color
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

  await cart.save();

  res.json({ message: "Cart updated", cart });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { productId, color } = req.body;
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  // Find user's cart
  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  // Remove product with matching productId AND color
  const initialLength = cart.products.length;
  cart.products = cart.products.filter(
    (item) => !(item.product.toString() === productId && item.color === color)
  );

  if (initialLength === cart.products.length) {
    throw new Error("Product with specified color not found in cart");
  }

  // Check if cart is empty after removal
  if (cart.products.length === 0) {
    // Delete the entire cart document
    await Cart.findByIdAndDelete(cart.productId);
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

  await cart.save();

  res.json({
    message: "Product removed from cart",
    cart,
  });
});


module.exports = {
  addToCart,
  getUserCart,
  deleteCart,
  applyCoupon,
  updateCartItem,
  removeCartItem,
};
