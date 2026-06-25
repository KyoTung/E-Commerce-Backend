const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin, isStaff } = require("../middleware/authMiddleWare");
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
  updateRole,
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
  loginWithGoogle // Sau đó mới đến Controller
);

router.post("/refresh", handleRefreshToken);

router.put('/password',authMiddleware, updatePassword);
router.post("/login", loginUser);
router.post("/admin-login", loginAdmin);


router.post("/logout", logout);
router.get("/wishlist", authMiddleware, getWishList);


router.get("/all-users",authMiddleware, isStaff, getAllUsers);
router.get("/:id",authMiddleware,getUser);

router.delete("/:id", authMiddleware,isAdmin, deleteUser);
router.put("/update-user/:id",authMiddleware,isStaff, updateUser);
router.put("/update-role/:id",authMiddleware,isAdmin, updateRole);
router.put("/update-informaion/:id", authMiddleware, updateInfo);

router.put("/block-user/:id", authMiddleware,isAdmin, blockUser);
router.put("/unlock-user/:id", authMiddleware, isAdmin, unlockUser);



module.exports = router;
