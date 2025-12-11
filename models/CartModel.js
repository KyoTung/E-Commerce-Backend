const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var cartSchema = new mongoose.Schema(
  {
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        count: Number,
        color: String,
        storage: String,
        price: Number,
      },
    ],
    cartTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAfterDiscount: {
      type: Number,
    },
    couponApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", cartSchema);
