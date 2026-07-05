const mongoose = require('mongoose');

const TrafficSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Traffic', TrafficSchema);