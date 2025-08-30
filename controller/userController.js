const User = require("../models/UserModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongoDB");
const { generateRefreshToken } = require("../config/refreshToken");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailController");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

// Create a new user
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    const newUser = await User.create(req.body);
    res.json({
      message: "User created successfully",
      success: true,
      user: newUser,
    });
  } else {
    throw new Error("User already exists");
  }
});

// login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email: email });

  if (!findUser) {
    throw new Error("Account Not Found");
  }

  const isPasswordValid = await findUser.isPasswordMatched(password);
  if (!isPasswordValid) {
    throw new Error("Incorrect Password");
  }

  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateUser = await User.findByIdAndUpdate(
      findUser.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findUser?._id,
      fullName: findUser?.$assertPopulated,
      email: findUser?.$assertPopulated,
      address: findUser?.address,
      phone: findUser?.phone,
      token: generateToken(findUser?._id),
    });
  } else {
    throw new Error("Invalid Crendentials!");
  }
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findAdmin = await User.findOne({ email });

  if (!findAdmin) {
    throw new Error("Administrator Account Not Found");
  }

  if (findAdmin.role !== "admin") {
    throw new Error("No Access");
  }

  const isPasswordValid = await findAdmin.isPasswordMatched(password);
  if (!isPasswordValid) {
    throw new Error("Incorrect Password");
  }

  const refreshToken = await generateRefreshToken(findAdmin.id);
  await User.findByIdAndUpdate(findAdmin._id, { refreshToken }, { new: true });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000,
  });

  res.json({
    _id: findAdmin._id,
    fullName: findAdmin.fullName,
    email: findAdmin.email,
    address: findAdmin.address,
    phone: findAdmin.phone,
    token: generateToken(findAdmin._id),
  });
});

const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) {
    throw new Error("No Refresh Token In Cookies");
  }
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user)
    throw new Error("No refresh token present in database or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user?._id);

    res.json({
      accessToken: accessToken,
    });
  });
});

// get all users
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const allUsers = await User.find();
    res.json(allUsers);
  } catch (error) {
    throw new Error(error);
  }
});

// get a single user
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const user = await User.findById(id);
    res.json(user);
  } catch (error) {
    throw new Error(error);
  }
});

// delete a user
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deleteUser = await User.findByIdAndDelete(id);
    res.json({
      message: "User deleted successfully",
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

//update a user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.user;
  validateMongoDbId(id);
  try {
    const updateUser = await User.findByIdAndUpdate(
      id,
      {
        fullName: req?.body?.fullName,
        email: req?.body?.email,
        address: req?.body?.address,
        phone: req?.body?.phone,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User updated successfully",
      success: true,
      user: updateUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// save address user
const updateInfo = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
        phone: req?.body?.phone,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "Infomation updated successfully",
      success: true,
      user: updateUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const block = await User.findByIdAndUpdate(
      id,
      { isBlock: true },
      { new: true }
    );
    res.json({
      message: "user blocked successfully!",
    });
  } catch (error) {
    throw new Error(error);
  }
});

const unlockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const unlock = await User.findByIdAndUpdate(
      id,
      { isBlock: false },
      { new: true }
    );
    res.json({
      message: "user unlocked successfully!",
    });
  } catch (error) {
    throw new Error(error);
  }
});

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  const refreshToken = cookie.refreshToken;
  if (!cookie?.refreshToken) {
    throw new Error("No Refresh Token In Cookies");
  }
  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204);
  }
  await User.findOneAndUpdate(
    { refreshToken: refreshToken },
    { refreshToken: "" }
  );
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.sendStatus(204);
});

const updatePassword = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { password } = req.body;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  if (password) {
    user.password = password;
    const updatePassword = await user.save();
    res.json(updatePassword);
  } else {
    res.json(user);
  }
});

const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found with this email");
  }
  try {
    const token = await user.createResetToken();
    await user.save();
    const resetURL = `Hi, Please folow this link to to reset your Password. This link is valid till 10 minutes from now. <a href='http://localhost:5000/api/user/reset-password/${token}'>Click Here</a>`;
    const data = {
      to: email,
      text: "Hey User",
      subject: "Forgot Password Link",
      html: resetURL,
    };
    sendEmail(data);
    res.json(token);
  } catch (error) {
    throw new Error(error);
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const token = req.params.token;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    throw new Error("Token Expired. Please try again later");
  }
  user.password = password;
  user.passwordResetExpires = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  res.json({ user: user, message: "Password reset successful" });
});

const getWishList = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const findUser = await User.findById(_id).populate("wishlist");
    res.json(findUser);
  } catch (error) {
    throw new Error(error);
  }
});

const addToCart = asyncHandler(async (req, res) => {
  // Lấy dữ liệu cart từ body request
  const { cart } = req.body;
  // Lấy _id user từ object req.user (do middleware auth gán)
  const { _id } = req.user;
  // Kiểm tra id user có hợp lệ không (phải là ObjectId hợp lệ)
  validateMongoDbId(_id);
  
  try {
    // Tìm user hiện tại trong database
    const findUser = await User.findById(_id);
    // Tìm cart hiện tại của user (nếu có)
    let existingCart = await Cart.findOne({ orderby: findUser._id });

    // Nếu chưa có cart thì tạo mới
    if (!existingCart) {
      let products = [];
      let cartTotal = 0;

      // Duyệt qua từng sản phẩm trong mảng cart gửi lên từ frontend
      for (let i = 0; i < cart.length; i++) {
        let object = {};
        object.product = cart[i]._id;  // Lưu id sản phẩm
        object.count = cart[i].count;  // Lưu số lượng mua
        object.color = cart[i].color;  // Lưu màu sản phẩm nếu có

        // Lấy giá sản phẩm từ database
        let getPrice = await Product.findById(cart[i]._id).select("price").exec();
        object.price = getPrice ? getPrice.price : 0; // Nếu không tìm thấy thì gán 0

        products.push(object);                        // Thêm object vào mảng products
        cartTotal += object.price * object.count;     // Cộng dồn tổng tiền cart
      }

      // Tạo cart mới với các sản phẩm và tổng tiền vừa tính
      const newCart = await new Cart({
        products,
        orderby: findUser._id,
        cartTotal,
      }).save();
      return res.json(newCart); // Trả về cart vừa tạo
    }

    // Nếu đã có cart, tiến hành merge sản phẩm mới vào cart cũ
    for (let i = 0; i < cart.length; i++) {
      const incomingItem = cart[i];
      // Kiểm tra sản phẩm này đã có trong cart chưa (so sánh theo id & color)
      const existingProductIndex = existingCart.products.findIndex(
        p => p.product.toString() === incomingItem._id && p.color === incomingItem.color
      );

      // Lấy giá mới nhất của sản phẩm từ DB
      let productPrice = await Product.findById(incomingItem._id).select("price").exec();
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
      (total, item) => total + (item.price * item.count),
      0
    );

    // Lưu lại cart đã cập nhật
    const updatedCart = await existingCart.save();
    res.json(updatedCart); // Trả về cart đã cập nhật
  } catch (error) {
    // Nếu có lỗi thì trả về lỗi cho client
    throw new Error(error);
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
  const cart = await Cart.findOne({ orderby: findUser._id }).populate("products.product");
  if (!cart) throw new Error("Cart not found");

  let { cartTotal } = cart;
  let totalAfterDiscount = (
    cartTotal - (cartTotal * validateCoupon.discount) / 100
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
  const { productId, color, count } = req.body;
  validateMongoDbId(_id);
  validateMongoDbId(productId);

  const cart = await Cart.findOne({ orderby: _id });
  if (!cart) throw new Error("Cart not found");

  // Find product to update (by both productId and color)
  let productIndex = cart.products.findIndex(
    item => item.product.toString() === productId && item.color === color
  );

  if (productIndex === -1) throw new Error("Product not in cart");

  if (count > 0) {
    // Update quantity
    cart.products[productIndex].count = count;
  } else {
    // Remove product if count = 0
    cart.products.splice(productIndex, 1);
  }

  // Check if cart is empty after update
  if (cart.products.length === 0) {
    // Delete the entire cart document
    await Cart.findByIdAndDelete(cart._id);
    return res.json({ 
      message: "Cart item updated - cart is now empty and was deleted",
      cart: null
    });
  }

  // Recalculate cart total if cart still has products
  cart.cartTotal = cart.products.reduce(
    (total, item) => total + (item.price * item.count),
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
    item => !(item.product.toString() === productId && item.color === color)
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
      cart: null
    });
  }
  
  // Recalculate cart total if cart still has products
  cart.cartTotal = cart.products.reduce(
    (total, item) => total + (item.price * item.count),
    0
  );

  await cart.save();

  res.json({
    message: "Product removed from cart",
    cart,
  });
});


module.exports = {
  createUser,
  loginUser,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  blockUser,
  unlockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishList,
  updateInfo,
  addToCart,
  getUserCart,
  deleteCart,
  applyCoupon,
  updateCartItem,
  removeCartItem
};
