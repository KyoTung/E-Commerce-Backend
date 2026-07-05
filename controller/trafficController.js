const Traffic = require('../models/TrafficModel');
const asyncHandler = require('express-async-handler');

const recordTraffic = asyncHandler(async (req, res) => {
    // Lấy IP của người dùng
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Lấy thời điểm bắt đầu ngày hôm nay (00:00:00)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Kiểm tra xem IP này hôm nay đã vào chưa
    const existingTraffic = await Traffic.findOne({
        ip: ip,
        createdAt: { $gte: startOfDay }
    });

    if (!existingTraffic) {
        // Nếu chưa -> Lưu vào DB
        await Traffic.create({ ip });
        res.json({ message: "Traffic recorded" });
    } else {
        // Nếu rồi -> Không làm gì cả
        res.json({ message: "Already recorded today" });
    }
});

const getTrafficStats = asyncHandler(async (req, res) => {
    // Đếm tổng số lượt truy cập
    const totalTraffic = await Traffic.countDocuments();
    res.json({ totalTraffic });
});

module.exports = { recordTraffic, getTrafficStats };