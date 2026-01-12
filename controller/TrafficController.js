const Visit = require('../models/VisitModel');
const asyncHandler = require('express-async-handler');

const recordVisit = asyncHandler(async (req, res) => {
    // Lấy IP của người dùng
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Lấy thời điểm bắt đầu ngày hôm nay (00:00:00)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Kiểm tra xem IP này hôm nay đã vào chưa
    const existingVisit = await Visit.findOne({
        ip: ip,
        createdAt: { $gte: startOfDay }
    });

    if (!existingVisit) {
        // Nếu chưa -> Lưu vào DB
        await Visit.create({ ip });
        res.json({ message: "Visit recorded" });
    } else {
        // Nếu rồi -> Không làm gì cả
        res.json({ message: "Already recorded today" });
    }
});

const getTrafficStats = asyncHandler(async (req, res) => {
    // Đếm tổng số lượt truy cập
    const totalVisits = await Visit.countDocuments();
    res.json({ totalVisits });
});

module.exports = { recordVisit, getTrafficStats };