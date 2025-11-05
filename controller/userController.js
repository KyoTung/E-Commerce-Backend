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
    throw new Error("Không tìm thấy tài khoản hoặc tài khoản không tồn tại!");
  }

  const isPasswordValid = await findUser.isPasswordMatched(password);
  if (!isPasswordValid) {
    throw new Error("Sai mật khẩu!");
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
    throw new Error("Đăng nhập thất bại!");
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
