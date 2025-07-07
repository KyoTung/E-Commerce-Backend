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
      emum: ["Apple", "Samsung", "Xiaomi", "Sony", "Lenovo"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    quantity: {
        type:Number,
        required:true,
    },
    images: {
      type: Array,
    },
    sold: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      emum: ["White", "Black", "Brown", "Red", "Yellow"],
    },
    rating: [
      {
        star: Number,
        posteby: { type: mongoose.Schema.ObjectId, ref: "User" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
