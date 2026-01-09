const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");
const CryptoJS = require("crypto-js");
const moment = require("moment");

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

    // Kiểm tra số lượng tồn kho
    for (const item of findCart.products) {
      const product = await Product.findById(item.product._id);
      if (product.quantity < item.count) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${product.title}`,
        });
      }
    }

    let finalAmount = 0;
    if (couponApplied && findCart.totalAfterDiscount) {
      finalAmount = findCart.totalAfterDiscount;
    } else {
      finalAmount = findCart.cartTotal;
    }

    // Tạo đơn hàng mới
    const newOrder = new Order({
      products: findCart.products,
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

    // Cập nhật số lượng sản phẩm đã bán
    const updates = findCart.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product._id },
        update: {
          $inc: {
            quantity: -item.count,
            sold: +item.count,
          },
        },
      },
    }));

    await Product.bulkWrite(updates);

    // Xóa giỏ hàng
    await Cart.deleteOne({ orderby: findUser._id });

    res.json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error);

    // Phân loại lỗi để trả về thông báo phù hợp
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
        select: "title images price color",
      })
      .sort({ createdAt: -1 });

    if (order == null) {
      res.json({
        message: "No orders yet",
        order,
      });
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
        select: "name images price",
      })
      .exec();

    if (order == null) {
      res.json({
        message: "No orders yet",
        order,
      });
    } else {
      res.json(order);
    }
  } catch (error) {
    throw new Error(error);
  }
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus, paymentIntentStatus } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);
  const allowedOrderStatus = [
    "Not Processed",
    "Confirmed",
    "Processing",
    "Dispatched",
    "Cancelled",
    "Delivered",
    "Returned",
  ];
  const allowedPaymentStatus = [
    "not_paid",
    "paid",
    "failed",
    "refunded",
    "authorized",
  ];

  if (!allowedOrderStatus.includes(status)) {
    throw new Error("Invalid order status");
  }
  if (!allowedPaymentStatus.includes(paymentStatus)) {
    throw new Error("Invalid payment status");
  }
  try {
    const updateOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status,
        paymentStatus: paymentStatus,
        paymentIntent: { status: paymentIntentStatus },
      },
      { new: true }
    );
    console.log(req.body);
    res.json({
      message: "Update status order successfully",
      updateOrder,
    });
  } catch (error) {
    throw new Error(error);
  }
});
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user; // Lấy ID user đang đăng nhập từ middleware

  validateMongoDbId(id);

  try {
    const findOrder = await Order.findById(id);

    if (!findOrder) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    // --- 1. BẢO MẬT: Kiểm tra xem đơn hàng này có phải của User đang login không ---
    // So sánh ID người đặt (orderby) với ID người đang login (_id)
    if (findOrder.orderby.toString() !== _id.toString()) {
      res.status(403);
      throw new Error("Bạn không có quyền hủy đơn hàng của người khác");
    }

    // --- 2. LOGIC: Chỉ cho phép hủy khi trạng thái hợp lệ (Allow List) ---
    // Yêu cầu: Chỉ "Not Processed" và "Confirmed" mới được hủy
    const allowedStatusToCancel = ["Not Processed", "Confirmed"];
    
    if (!allowedStatusToCancel.includes(findOrder.orderStatus)) {
      res.status(400);
      throw new Error(
        `Không thể hủy đơn hàng đang ở trạng thái: ${findOrder.orderStatus}. Chỉ có thể hủy khi đơn hàng chưa được xử lý hoặc mới xác nhận.`
      );
    }

    // Cập nhật trạng thái
    const cancelledOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: "Cancelled",
      },
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

const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user; // Lấy ID user từ token để bảo mật

  try {
    // 1. Tìm đơn hàng
    const order = await Order.findOne({ _id: id, orderby: _id });
    if (!order) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    // 2. HOÀN TRẢ TỒN KHO (QUAN TRỌNG)
    // Duyệt qua từng sản phẩm trong đơn hàng để cộng lại vào kho
    const bulkOps = order.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product }, // Tìm sản phẩm theo ID
        update: { 
            $inc: { 
                quantity: +item.count, // Cộng lại số lượng đã trừ
                sold: -item.count      // Trừ đi số lượng đã bán
            } 
        },
      },
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    // 3. Xóa đơn hàng
    await Order.findByIdAndDelete(id);

    res.json({ success: true, message: "Order deleted and stock restored" });
    
  } catch (error) {
    throw new Error(error);
  }
});

const repayOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);

  if (!order) throw new Error("Không tìm thấy đơn hàng");
  if (order.isPaid) throw new Error("Đơn hàng này đã thanh toán rồi");

  // --- GỌI ZALOPAY TẠO URL MỚI ---
  const embed_data = { redirecturl: `${process.env.CLIENT_URL}/payment-result` };
  const items = order.orderItems; // Lấy lại item cũ
  const transID = Math.floor(Math.random() * 1000000); // Tạo mã giao dịch mới cho Zalo

  const orderZalo = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`, // Mã giao dịch mới
    app_user: order.user ? order.user.toString() : "guest",
    app_time: Date.now(),
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: order.totalPrice,
    description: `Thanh toan don hang #${id}`,
    bank_code: "", // Để trống để cho người dùng chọn ngân hàng
    callback_url: `${process.env.BASE_URL}/api/order/zalopay_callback` // URL backend nhận kết quả
  };

  // Tạo chữ ký (MAC)
  const data = config.app_id + "|" + orderZalo.app_trans_id + "|" + orderZalo.app_user + "|" + orderZalo.amount + "|" + orderZalo.app_time + "|" + orderZalo.embed_data + "|" + orderZalo.item;
  orderZalo.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
      const result = await axios.post(config.endpoint, null, { params: orderZalo });
      
      // Cập nhật lại app_trans_id mới vào đơn hàng (để tracking sau này nếu cần)
      order.paymentResult = { 
          id: orderZalo.app_trans_id, 
          status: "Pending", 
          update_time: Date.now() 
      };
      await order.save();

      return res.status(200).json({ paymentUrl: result.data.order_url });
  } catch (err) {
      throw new Error("Lỗi kết nối ZaloPay");
  }
});

const switchToCOD = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 1. Tìm đơn hàng
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error("Không tìm thấy đơn hàng");
  }

  // 2. Chỉ cho phép đổi nếu đơn hàng chưa thanh toán
  if (order.status === "not_paid") {
    res.status(400);
    throw new Error("Đơn hàng này đã được thanh toán online rồi, không thể đổi sang COD!");
  }

  // 3. Cập nhật thông tin
  order.paymentMethod = "cod";
  order.paymentResult = { // Xóa thông tin giao dịch lỗi cũ (nếu muốn sạch data)
      status: "Switched to cod",
      update_time: Date.now()
  };
  order.paymentStatus = "not_paid";
  order.paymentIntent = {
      id: uniqid(),
      method: "cod",
      amount: order.total,
      currency: "VND",
      status: "pending"
  };
  
  const updatedOrder = await order.save();

  res.json(updatedOrder);
});

module.exports = {
  createOrder,
  getOrderUser,
  updateStatus,
  getAllOrders,
  getOrderDetail,
  cancelOrder,
  deleteOrder,
  repayOrder,
  switchToCOD
};
