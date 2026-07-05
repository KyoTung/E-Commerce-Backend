const express = require("express");
const { 
  recordTraffic, 
  getTrafficStats 
} = require('../controller/trafficController');

const router = express.Router();

// Route để ghi nhận lượt truy cập
router.post("/record", recordTraffic);

// Route để lấy thống kê hiển thị lên Admin Dashboard
router.get("/", getTrafficStats);

module.exports = router;