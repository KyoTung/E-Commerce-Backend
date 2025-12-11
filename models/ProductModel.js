const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    description: String,

    basePrice: {
      type: Number,
      required: true,
    },

    images: [
      {
        url: String,
        asset_id: String,
        public_id: String,
      },
    ],

    brand: {
      type: String,
      required: true,
    },
    slugBrand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    slugCategory: {
      type: String,
      required: true,
    },

    variants: [
      {
        color: { type: String },
        storage: { type: String },
        price: { type: Number },
        quantity: { type: Number },
        images: [ {
        url: String,
        asset_id: String,
        public_id: String,
      }],
      },
    ],

    tags: [{ type: String }],

    specifications: {
      screen: String,
      processor: String,
      storage: String,
      ram: String,
      battery: String,
      os: String,
      frontCamera: String,
      rearCamera: String,
      sim: String,
      design: String,
    },

    rating: [
      {
        star: { type: Number, required: true },
        comment: String,
        posteby: { type: mongoose.Schema.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    totalRating: {
      type: Number,
      default: 0,
    },

    sold: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
