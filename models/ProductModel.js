const mongoose = require("mongoose");

var productSchema = new mongoose.Schema(
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
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      select: false,
    },
    images: {
      type: Array,
    },
    sold: {
      type: Number,
      default: 0,
      select: false,
    },
     color: {
      type: String, 
      required: true,
    },

    rating: [
      {
        star: Number,
        comment: String,
        posteby: { type: mongoose.Schema.ObjectId, ref: "User" },
      },
    ],
    totalRating:{
      type:Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
