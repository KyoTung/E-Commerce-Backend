const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin } = require("../middleware/authMiddleWare");
const {
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
  userCart,
  getUserCart,
  deleteCart,
  applyCoupon,
} = require("../controller/userController");


router.post("/register", createUser);
router.post('/forgot-password-token', forgotPasswordToken );
router.put('/reset-password/:token', resetPassword );

router.put('/password',authMiddleware, updatePassword);
router.post("/login", loginUser);
router.post("/admin-login", loginAdmin);
router.post("/cart", authMiddleware, userCart);
router.post("/apply-coupon", authMiddleware, applyCoupon);

router.get("/refresh", handleRefreshToken);
router.get("/logout", logout);
router.get("/wishlist", authMiddleware, getWishList);
router.get("/cart", authMiddleware, getUserCart);


router.get("/all-users", getAllUsers);
router.get("/:id",authMiddleware,isAdmin,getUser);
router.delete("/cart",authMiddleware, deleteCart)
router.delete("/:id", deleteUser);
router.put("/update-user",authMiddleware,isAdmin, updateUser);
router.put("/update-informaion", authMiddleware, updateInfo)

router.put("/block-user/:id", authMiddleware, blockUser);
router.put("/unlock-user/:id", authMiddleware, unlockUser);



module.exports = router;
