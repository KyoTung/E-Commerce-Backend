const mongoose = require('mongoose');

const TraficSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Visit', TraficSchema);