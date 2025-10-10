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
} = require("../controller/userController");


router.post("/register", createUser);
router.post('/forgot-password-token', forgotPasswordToken );
router.put('/reset-password/:token', resetPassword );

router.put('/password',authMiddleware, updatePassword);
router.post("/login", loginUser);
router.post("/admin-login", loginAdmin);

router.get("/refresh", handleRefreshToken);
router.get("/logout", logout);
router.get("/wishlist", authMiddleware, getWishList);


router.get("/all-users",authMiddleware, getAllUsers);
router.get("/:id",authMiddleware,getUser);

router.delete("/:id", deleteUser);
router.put("/update-user/:id",authMiddleware,isAdmin, updateUser);
router.put("/update-informaion/:id", authMiddleware, updateInfo)

router.put("/block-user/:id", authMiddleware, blockUser);
router.put("/unlock-user/:id", authMiddleware, unlockUser);



module.exports = router;
