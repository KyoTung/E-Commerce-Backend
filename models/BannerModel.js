const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
   image: {
      url: { type: String, default: '' },
      asset_id: { type: String, default: '' },
      public_id: { type: String, default: '' },
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