const User = require("../models/UserModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const { generateAccessToken, generateRefreshToken  } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongoDB");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailController");
const crypto = require("crypto");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
dotenv.config();

// Create a new user
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone; 

  const findUser = await User.findOne({ email: email });
  
if (mobile) {
    const findMobile = await User.findOne({ mobile: mobile });
    if (findMobile) {
      throw new Error("Phone number already exists");
    }
  }

  if (!findUser && !findMobile) {
  
    const newUser = await User.create(req.body);
    res.json({
      message: "User created successfully",
      success: true,
      user: newUser,
    });
  } else {
    if (findUser) {
      throw new Error("User already exists (Email is taken)");
    }
    if (findMobile) {
      throw new Error("Phone number already exists");
    }
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ message: "Tài khoản không tồn tại!" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Sai mật khẩu!" });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.json({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    token: accessToken,
  });
});

//REFRESH TOKEN
const handleRefreshToken = asyncHandler(async (req, res) => {
  const rt = req.cookies?.refreshToken;

  if (!rt)
    return res.status(401).json({ message: "Vui lòng đăng nhập" });

  try {
    // Verify token
    const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id || decoded.sub);

    // Phát hiện token bị dùng lại hoặc user không khớp
    if (!user || user.refreshToken !== rt) {
      
      // if (user) {
      //   user.refreshToken = null;
      //   await user.save();
      // }
      // Xóa cookie phía client
      res.clearCookie("refreshToken", { ...cookieOptions, maxAge: 0 });
      return res
        .status(403)
        .json({ message: "Refresh token reused or invalid" });
    }

    // --- CẤP MỚI (ROTATION) ---
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Cập nhật DB
    user.refreshToken = newRefreshToken;
    await user.save();

    // Gửi Cookie Mới
    res.cookie("refreshToken", newRefreshToken, cookieOptions);

    // Trả về Access Token Mới
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    // Token hết hạn hoặc không hợp lệ
    res.clearCookie("refreshToken", { ...cookieOptions, maxAge: 0 });
    return res
      .status(403)
      .json({ message: "Expired or invalid refresh token" });
  }
});

// LOGOUT
const logout = asyncHandler(async (req, res) => {
  const rt = req.cookies?.refreshToken;

  if (rt) {
    try {
      const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id || decoded.sub);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    } catch (err) {}
  }

  res.clearCookie("refreshToken", { ...cookieOptions, maxAge: 0 });

  return res.json({ message: "Logged out successfully" });
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

// get all users
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const allUsers = await User.find().sort({ createdAt: -1 });
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
      deleteUser,
      message: "User deleted successfully",
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

//update a user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updateUser = await User.findByIdAndUpdate(
      id,
      {
        fullName: req?.body?.fullName,
        address: req?.body?.address,
        phone: req?.body?.phone,
        role: req?.body?.role,
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
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        fullName: req?.body?.fullName,
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
      data: block,
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
      data: unlock,
      message: "user unlocked successfully!",
    });
  } catch (error) {
    throw new Error(error);
  }
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
    return res.status(401).json({ message: "Tài khoản không tồn tại!" });
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
    //throw new Error(error);
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
};
