const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");

// =========================================================================
// 1. TẠO ĐƠN HÀNG (Kiểm tra và Trừ kho theo Biến thể: Màu sắc + Bộ nhớ)
// =========================================================================
const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, couponApplied, customerInfo } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    // Kiểm tra phương thức thanh toán
    const allowedMethods = ["cod", "bank_transfer", "momo", "vnpay", "paypal", "ZaloPay"];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // Kiểm tra thông tin người nhận
    if (
      !customerInfo ||
      !customerInfo.name ||
      !customerInfo.address ||
      !customerInfo.phone
    ) {
      return res.status(400).json({ error: "Missing customer information" });
    }

    const findUser = await User.findById(_id);
    const findCart = await Cart.findOne({ orderby: findUser._id }).populate(
      "products.product"
    );

    if (!findCart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (findCart.products.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // --- KIỂM TRA TỒN KHO CHI TIẾT THEO BIẾN THỂ (MÀU SẮC + BỘ NHỚ) ---
    for (const item of findCart.products) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${item.product._id}` });
      }

      // Tìm chính xác object biến thể đáp ứng cùng lúc cả màu sắc và bộ nhớ đã chọn
      const selectedVariant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage
      );

      if (!selectedVariant) {
        return res.status(400).json({
          error: `Không tồn tại phân loại Màu: ${item.color} - Bộ nhớ: ${item.storage} cho sản phẩm: ${product.title}`,
        });
      }

      if (selectedVariant.quantity < item.count) {
        return res.status(400).json({
          error: `Sản phẩm ${product.title} (Màu: ${item.color} - ${item.storage}) không đủ số lượng trong kho. Còn lại: ${selectedVariant.quantity}`,
        });
      }
    }

    let finalAmount = 0;
    if (couponApplied && findCart.totalAfterDiscount) {
      finalAmount = findCart.totalAfterDiscount;
    } else {
      finalAmount = findCart.cartTotal;
    }

    // Tạo đơn hàng mới (Đảm bảo Cart của bạn đã lưu trường storage)
    const newOrder = new Order({
      products: findCart.products.map(item => ({
        product: item.product._id,
        count: item.count,
        color: item.color,
        storage: item.storage, // Thêm trường lưu thông tin bộ nhớ vào đơn hàng
        price: item.price
      })),
      paymentIntent: {
        id: uniqid(),
        method: paymentMethod,
        amount: finalAmount,
        currency: "VND",
        status: "pending",
      },
      orderby: findUser._id,
      paymentMethod,
      orderStatus: "Not Processed",
      paymentStatus: "not_paid",
      total: finalAmount,
      customerInfo,
    });

    await newOrder.save();

    // --- CẬP NHẬT TRỪ KHO THEO BIẾN THỂ BẰNG BULKWRITE ---
    const updates = findCart.products.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product._id,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage } // Tìm trúng phần tử mảng thỏa mãn đồng thời
          }
        },
        update: {
          $inc: {
            "variants.$.quantity": -item.count, // Sử dụng toán tử vị trí đại diện $ để trừ kho biến thể
            sold: +item.count,                  // Tăng số lượng đã bán tổng của sản phẩm
          },
        },
      },
    }));

    await Product.bulkWrite(updates);

    // Xóa giỏ hàng sau khi đặt thành công
    await Cart.deleteOne({ orderby: findUser._id });

    res.json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        error: "Validation Error",
        details: errors,
      });
    }
    res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
});

// =========================================================================
// 2. CẬP NHẬT TRẠNG THÁI (Admin - Chống nhảy cấp + Hoàn kho khi Hủy/Trả hàng)
// =========================================================================
const updateStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus, paymentIntentStatus } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);

  // Định nghĩa luồng chuyển đổi trạng thái hợp lệ
  const statusTransitions = {
    "Not Processed": ["Confirmed", "Cancelled"],
    "Confirmed": ["Processing", "Cancelled"],
    "Processing": ["Dispatched", "Cancelled"],
    "Dispatched": ["Delivered", "Cancelled", "Returned"],
    "Delivered": ["Returned"],
    "Cancelled": [],
    "Returned": [],
  };

  const allowedPaymentStatus = [
    "not_paid", "paid", "failed", "refunded", "authorized",
  ];

  if (paymentStatus && !allowedPaymentStatus.includes(paymentStatus)) {
    throw new Error("Invalid payment status");
  }

  try {
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      throw new Error("Order not found");
    }

    const currentStatus = existingOrder.orderStatus;

    // Kiểm tra tính tuần tự logic trạng thái
    if (status && status !== currentStatus) {
      const allowedNextStatuses = statusTransitions[currentStatus] || [];
      if (!allowedNextStatuses.includes(status)) {
        throw new Error(`Invalid status update: Cannot change from '${currentStatus}' to '${status}'.`);
      }
    }

    // --- XỬ LÝ HOÀN KHO KHI CHUYỂN TRẠNG THÁI SANG HỦY HOẶC TRẢ HÀNG ---
    const isTransitioningToReturned = status === "Returned" && currentStatus !== "Returned";
    const isTransitioningToCancelled = status === "Cancelled" && currentStatus !== "Cancelled";

    if (isTransitioningToReturned || isTransitioningToCancelled) {
      const bulkOps = existingOrder.products.map((item) => ({
        updateOne: {
          filter: {
            _id: item.product, // item.product lúc này là ObjectId dạng thô từ db đơn hàng
            variants: {
              $elemMatch: { color: item.color, storage: item.storage }
            }
          },
          update: {
            $inc: {
              "variants.$.quantity": +item.count, // Cộng hoàn trả lại kho biến thể
              sold: -item.count,                  // Khấu trừ số lượng đã bán tổng
            },
          },
        },
      }));

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }
    }

    // Tiến hành lưu dữ liệu cập nhật mới
    const updateOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status || currentStatus,
        paymentStatus: paymentStatus || existingOrder.paymentStatus,
        paymentIntent: {
          status: paymentIntentStatus !== undefined ? paymentIntentStatus : existingOrder.paymentIntent?.status
        },
      },
      { new: true }
    );

    res.json({
      message: "Update status order successfully",
      updateOrder,
    });
  } catch (error) {
    throw new Error(error.message || error);
  }
});

// =========================================================================
// 3. HỦY ĐƠN HÀNG (Dành cho Client/User tự hủy đơn - Hoàn kho theo Biến thể)
// =========================================================================
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  validateMongoDbId(id);

  try {
    const findOrder = await Order.findById(id);

    if (!findOrder) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (findOrder.orderby.toString() !== _id.toString()) {
      res.status(403);
      throw new Error("Bạn không có quyền hủy đơn hàng của người khác");
    }

    const allowedStatusToCancel = ["Not Processed", "Confirmed"];
    if (!allowedStatusToCancel.includes(findOrder.orderStatus)) {
      res.status(400);
      throw new Error(
        `Không thể hủy đơn hàng đang ở trạng thái: ${findOrder.orderStatus}.`
      );
    }

    // --- HOÀN TRẢ TỒN KHO CHI TIẾT THEO MÀU + BỘ NHỚ KHI USER HỦY ĐƠN ---
    const bulkOps = findOrder.products.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage }
          }
        },
        update: {
          $inc: {
            "variants.$.quantity": +item.count, // Cộng lại kho
            sold: -item.count,                  // Trừ lượt bán tổng
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    const cancelledOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus: "Cancelled" },
      { new: true }
    );

    res.json({
      message: "Hủy đơn hàng thành công",
      cancelledOrder,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// =========================================================================
// 4. XÓA ĐƠN HÀNG (Admin xóa đơn cứng - Hoàn kho theo Biến thể)
// =========================================================================
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  try {
    const order = await Order.findOne({ _id: id, orderby: _id });
    if (!order) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    // --- ĐỒNG BỘ HOÀN TRẢ TỒN KHO BIẾN THỂ KHI ADMIN XÓA ĐƠN ---
    const bulkOps = order.products.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage }
          }
        },
        update: {
          $inc: {
            "variants.$.quantity": +item.count, // Hoàn kho biến thể
            sold: -item.count                   // Khấu trừ sold tổng
          }
        },
      },
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    await Order.findByIdAndDelete(id);

    res.json({ success: true, message: "Order deleted and stock restored" });
  } catch (error) {
    throw new Error(error);
  }
});

// =========================================================================
// CÁC HÀM TRUY XUẤT DỮ LIỆU ĐƠN HÀNG (Giữ nguyên giao diện phản hồi hệ thống)
// =========================================================================
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    throw new Error(error);
  }
});

const getOrderUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const findUser = await User.findById(_id);
    const order = await Order.find({ orderby: findUser._id })
      .populate({
        path: "products.product",
        select: "title images price color variants",
      })
      .sort({ createdAt: -1 });

    if (order == null) {
      res.json({ message: "No orders yet", order });
    } else {
      res.json(order);
    }
  } catch (error) {
    throw new Error(error);
  }
});

const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const order = await Order.findById(id)
      .populate({
        path: "products.product",
        select: "name images price variants",
      })
      .exec();

    if (order == null) {
      res.json({ message: "No orders yet", order });
    } else {
      res.json(order);
    }
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createOrder,
  getOrderUser,
  updateStatus,
  getAllOrders,
  getOrderDetail,
  cancelOrder,
  deleteOrder
};