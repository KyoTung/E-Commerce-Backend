const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: {
      url: { type: String, required: true },
      asset_id: String,
      public_id: String,
    },
    link: { type: String, default: '' },
    position: {
      type: String,
      enum: ['top', 'bottom-left', 'bottom-right', 'center', 'left', 'right', 'popup'],
      default: 'top',
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);