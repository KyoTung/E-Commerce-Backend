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

    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },

    variants: [
      {
        color: { type: String, required: true },
        storage: { type: String, required: true }, // ví dụ: "128GB", "256GB"
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        images: [{ type: String }]
      }
    ],

    tags: [{ type: String }],

    specifications: {
      screen: String,
      processor: String,
      ram: String,
      battery: String,
      os: String,
      frontCamera: String,
      rearCamera: String,
      sim: String,
      design: String
    },

    rating: [
      {
        star: { type: Number, required: true },
        comment: String,
        posteby: { type: mongoose.Schema.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    totalRating: {
      type: Number,
      default: 0,
    },

    sold: {
      type: Number,
      default: 0,
      select: false,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);