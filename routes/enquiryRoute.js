const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {
  createEnquiry,
  updateEnquiry,
  getAllEnquiry,
  getEnquiry,
  deleteEnquiry,
} = require("../controller/enquiryController");

router.post("/", authMiddleware, isAdmin, createEnquiry);
router.put("/:id", authMiddleware, isAdmin, updateEnquiry);
router.get("/", getAllEnquiry);
router.get("/:id", getEnquiry);
router.delete("/:id", authMiddleware, isAdmin, deleteEnquiry);

module.exports = router;
