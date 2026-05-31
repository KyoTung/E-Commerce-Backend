const mongoose = require("mongoose");

var orderSchema = new mongoose.Schema(
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
    paymentIntent: {
      id: String,
      method: String,
      amount: Number,
      
      currency: {
        type: String,
        default: "VND",
      },
      status: String,
    },
    orderStatus: {
      type: String,
      default: "Not Processed",
      enum: [
        "Not Processed",
        "Confirmed",
        "Processing",
        "Dispatched",
        "Cancelled",
        "Delivered",
        "Returned",
      ],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "momo", "vnpay", "paypal", "ZaloPay", "ZaloPay (Simulated)"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["not_paid", "paid", "failed", "refunded", "authorized"],
      default: "not_paid",
    },
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },

    total: {
      type: Number,
      required: true,
    },

    // --- CÁC TRƯỜNG THÊM MỚI ---
    couponApplied: {
      type: Boolean,
      default: false,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    // ---------------------------

    trackingNumber: {
      type: String,
      default: null,
    },
    customerInfo: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);