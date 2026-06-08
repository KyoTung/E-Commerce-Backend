const express = require("express");
const { isAdmin,isStaff, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {
  createColor,
  updateColor,
  getAllColor,
  getColor,
  deleteColor,
} = require("../controller/colorController");

router.post("/", authMiddleware,  isStaff, createColor);
router.put("/:id", authMiddleware,  isStaff, updateColor);
router.get("/", getAllColor);
router.get("/:id", getColor);
router.delete("/:id", authMiddleware, isAdmin, deleteColor);

module.exports = router;
