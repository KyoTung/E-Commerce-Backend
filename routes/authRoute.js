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
} = require("../controller/userController");

router.post("/register", createUser);
router.get("/login", loginUserController);
router.get("/all-users", getAllUsers);
router.get("/refresh", handleRefreshToken);
router.get("/logout", logout);

router.get("/:id",authMiddleware,isAdmin,getUser);
router.delete("/:id", deleteUser);
router.put("/update-user",authMiddleware,isAdmin, updateUser);
router.put("/block-user/:id", authMiddleware, blockUser);
router.put("/unlock-user/:id", authMiddleware, unlockUser);









module.exports = router;
