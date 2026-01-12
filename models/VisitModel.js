const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);