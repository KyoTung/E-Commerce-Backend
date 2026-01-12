const express = require("express");
const { 
  recordVisit, 
  getTrafficStats 
} = require('../controller/TrafficController');

const router = express.Router();

// Route để ghi nhận lượt truy cập
router.post("/record", recordVisit);

// Route để lấy thống kê hiển thị lên Admin Dashboard
router.get("/", getTrafficStats);

module.exports = router;