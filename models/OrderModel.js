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
        price: Number,
      },
    ],
      paymentIntent: {
        // Nên định nghĩa rõ cấu trúc con thay vì mảng rỗng
        id: String,        // ID từ gateway (e.g., pi_123 from Stripe)
        method: String,    // Phương thức chi tiết (e.g., "card_visa")
        amount: Number,    // Số tiền thực thanh toán
        currency: {
          type: String,
          default: "VND"
        },
        status: String     // Trạng thái từ gateway (e.g., "requires_action")
      },

    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "momo", "vnpay", "paypal"],
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
    },

    total: {
      type: Number,
      required: true,
    },
    
    trackingNumber: {
      type: String,
      default: null,
    },
        // Thông tin người nhận hàng (nếu đặt hộ)
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

//Export the model
module.exports = mongoose.model("Order", orderSchema);
