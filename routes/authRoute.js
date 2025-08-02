const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin } = require("../middleware/authMiddleWare");
const {
  createUser,
  loginUserController,
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
} = require("../controller/userController");

// Auth 
router.post("/register", createUser);
router.post('/forgot-password-token', forgotPasswordToken );
router.put('/reset-password/:token', resetPassword );

router.put('/password',authMiddleware, updatePassword);
router.get("/login", loginUserController);
router.get("/refresh", handleRefreshToken);
router.get("/logout", logout);

// User actions
router.get("/all-users", getAllUsers);
router.get("/:id",authMiddleware,isAdmin,getUser);
router.delete("/:id", deleteUser);
router.put("/update-user",authMiddleware,isAdmin, updateUser);

// Admin actions
router.put("/block-user/:id", authMiddleware, blockUser);
router.put("/unlock-user/:id", authMiddleware, unlockUser);









module.exports = router;
