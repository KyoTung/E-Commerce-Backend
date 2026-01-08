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
  loginWithGoogle
} = require("../controller/userController");
const passport = require("passport");

router.post("/register", createUser);
router.post('/forgot-password-token', forgotPasswordToken );
router.put('/reset-password/:token', resetPassword );

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route Callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }), // Middleware Passport chạy trước
  loginWithGoogle // Sau đó mới đến Controller của mình
);

router.put('/password',authMiddleware, updatePassword);
router.post("/login", loginUser);
router.post("/admin-login", loginAdmin);

router.post("/refresh", handleRefreshToken);
router.post("/logout", logout);
router.get("/wishlist", authMiddleware, getWishList);


router.get("/all-users",authMiddleware, getAllUsers);
router.get("/:id",authMiddleware,getUser);

router.delete("/:id", authMiddleware,isAdmin, deleteUser);
router.put("/update-user/:id",authMiddleware,isAdmin, updateUser);
router.put("/update-informaion/:id", authMiddleware, updateInfo)

router.put("/block-user/:id", authMiddleware, blockUser);
router.put("/unlock-user/:id", authMiddleware, unlockUser);



module.exports = router;
