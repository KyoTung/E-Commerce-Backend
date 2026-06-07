const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");
const mongoose = require("mongoose");  

// =========================================================================
// 1. TẠO ĐƠN HÀNG - Khách hàng tạo đơn luồng đặt hàng (Kiểm tra và Trừ kho theo Biến thể: Màu sắc + Bộ nhớ)
// =========================================================================

const createOrder = asyncHandler(async (req, res) => {
  const { 
    paymentMethod, 
    couponCode,     // Frontend gửi text mã giảm giá (VD: "TET2024")
    shippingFee, 
    customerInfo,
    selectedItems
  } = req.body;
  
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    // Validate cơ bản
    const allowedMethods = ["cod", "bank_transfer", "momo", "vnpay", "paypal", "ZaloPay"];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }
    if (!customerInfo || !customerInfo.name || !customerInfo.address || !customerInfo.phone) {
      return res.status(400).json({ error: "Missing customer information" });
    }

    const findUser = await User.findById(_id);
    const findCart = await Cart.findOne({ orderby: findUser._id }).populate("products.product");

    if (!findCart || findCart.products.length === 0) {
      return res.status(400).json({ error: "Cart is empty or not found" });
    }

    // Lọc sản phẩm thanh toán
    const itemsToCheckout = selectedItems && selectedItems.length > 0 
      ? findCart.products.filter(cartItem =>
          selectedItems.some(selectedItem =>
            selectedItem.productId === cartItem.product._id.toString() &&
            selectedItem.color === cartItem.color &&
            selectedItem.storage === cartItem.storage
          )
        )
      : findCart.products; 

    if (itemsToCheckout.length === 0) {
      return res.status(400).json({ error: "Không tìm thấy sản phẩm hợp lệ để thanh toán" });
    }

    let calculateTotal = 0; // TỔNG TIỀN GỐC (Tính từ DB)

    // Kiểm tra tồn kho & Tính tiền
    for (const item of itemsToCheckout) {
      const product = await Product.findById(item.product._id);
      if (!product) return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${item.product._id}` });

      const selectedVariant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage
      );

      if (!selectedVariant) {
        return res.status(400).json({ error: `Không tồn tại phân loại Màu: ${item.color} cho sản phẩm: ${product.title}` });
      }
      if (selectedVariant.quantity < item.count) {
        return res.status(400).json({ error: `Sản phẩm ${product.title} không đủ hàng.` });
      }

      // Cộng dồn tiền gốc từ giá lưu trong DB
      calculateTotal += item.price * item.count;
    }

    // XỬ LÝ MÃ GIẢM GIÁ
    let discountAmount = 0;
    let isCouponApplied = false;

    if (couponCode) {
      const validCoupon = await Coupon.findOne({ name: couponCode });
      if (!validCoupon) {
        return res.status(400).json({ error: "Mã giảm giá không tồn tại hoặc đã hết hạn" });
      }
      discountAmount = (calculateTotal * validCoupon.discount) / 100;
      isCouponApplied = true;
    }

    // CHỐT TỔNG TIỀN CUỐI CÙNG
    const safeShippingFee = shippingFee || 0;
    const finalAmount = calculateTotal - discountAmount + safeShippingFee;

    // Tạo đơn hàng
    const newOrder = new Order({
      products: itemsToCheckout.map(item => ({
        product: item.product._id,
        count: item.count,
        color: item.color,
        storage: item.storage,
        price: item.price
      })),
      paymentIntent: {
        id: uniqid(),
        method: paymentMethod,
        amount: finalAmount, // Sử dụng tiền Backend tính
        currency: "VND",
        status: "pending",
      },
      orderby: findUser._id,
      paymentMethod,
      orderStatus: "Not Processed",
      paymentStatus: "not_paid",
      
      // Lưu thông số tài chính chuẩn xác
      total: finalAmount,
      couponApplied: isCouponApplied,
      discountAmount: discountAmount,
      shippingFee: safeShippingFee,
      customerInfo,
    });

    await newOrder.save();

    // Cập nhật trừ kho
    const updates = itemsToCheckout.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product._id,
          variants: { $elemMatch: { color: item.color, storage: item.storage } }
        },
        update: {
          $inc: {
            "variants.$.quantity": -item.count, 
            sold: +item.count,                  
          },
        },
      },
    }));
    await Product.bulkWrite(updates);

    // Dọn giỏ hàng (giữ lại các món chưa thanh toán)
    const remainingItems = findCart.products.filter(cartItem =>
      !itemsToCheckout.some(purchasedItem =>
        purchasedItem.product._id.toString() === cartItem.product._id.toString() &&
        purchasedItem.color === cartItem.color &&
        purchasedItem.storage === cartItem.storage
      )
    );

    if (remainingItems.length === 0) {
      await Cart.findByIdAndDelete(findCart._id);
    } else {
      findCart.products = remainingItems;
      findCart.cartTotal = remainingItems.reduce((total, item) => total + item.price * item.count, 0);
      findCart.totalAfterDiscount = undefined; // Quét sạch trạng thái cũ nếu có
      await findCart.save();
    }

    res.json({
      message: "Thanh toán thành công",
      order: newOrder,
    });

  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Thanh toán thất bại", details: error.message });
  }
});

// =========================================================================
// TẠO ĐƠN HÀNG THỦ CÔNG - ADMIN tạo đơn luồng quản trị (Kiểm tra và Trừ kho theo Biến thể: Màu sắc + Bộ nhớ)
// =========================================================================
const adminCreateOrder = asyncHandler(async (req, res) => {
  const {
    customerInfo,
    orderItems,
    shippingFee,
    discountAmount,
    paymentMethod,
    paymentStatus,
    orderStatus,
  } = req.body;

  const adminId = req.user._id; // ID của admin tạo đơn
  validateMongoDbId(adminId);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!orderItems || orderItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Đơn hàng phải có ít nhất 1 sản phẩm" });
    }

    let calculateTotal = 0;
    const orderProducts = [];

    // 1. KIỂM TRA TỒN KHO & LẤY GIÁ TỪ DB (KHÔNG TIN CLIENT)
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${item.product}` });
      }

      const selectedVariant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage
      );
      if (!selectedVariant) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: `Không tồn tại phân loại ${item.color} - ${item.storage} của sản phẩm ${product.title}`,
        });
      }

      if (selectedVariant.quantity < item.count) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: `Sản phẩm ${product.title} (${item.color}-${item.storage}) chỉ còn ${selectedVariant.quantity} trong kho.`,
        });
      }

      // Lấy giá thật từ database
      const realPrice = selectedVariant.price;
      calculateTotal += realPrice * item.count;

      orderProducts.push({
        product: product._id,
        count: item.count,
        color: item.color,
        storage: item.storage,
        price: realPrice,
      });
    }

    // 2. TÍNH TỔNG TIỀN
    const finalAmount = calculateTotal + (shippingFee || 0) - (discountAmount || 0);

    // 3. TẠO ĐƠN HÀNG TRONG TRANSACTION
    const newOrder = new Order({
      products: orderProducts,
      orderby: adminId, // Lưu admin là người tạo (hoặc bạn có thể lưu null nếu muốn)
      paymentMethod: paymentMethod || "cod",
      orderStatus: orderStatus || "Confirmed",
      paymentStatus: paymentStatus || "not_paid",
      total: finalAmount,
      discountAmount: discountAmount || 0,
      shippingFee: shippingFee || 0,
      customerInfo,
      createdByAdmin: true,
    });

    await newOrder.save({ session });

    // 4. CẬP NHẬT TỒN KHO (BULK WRITE)
    const updates = orderItems.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
          variants: { $elemMatch: { color: item.color, storage: item.storage } }
        },
        update: {
          $inc: {
            "variants.$.quantity": -item.count,
            sold: +item.count,
          },
        },
      },
    }));

    await Product.bulkWrite(updates, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Tạo đơn hàng thành công",
      order: newOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Admin Create Order Error:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi tạo đơn hàng", details: error.message });
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
      message: "Cập nhật trạng thái đơn hàng thành công",
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
// CÁC HÀM TRUY XUẤT DỮ LIỆU ĐƠN HÀNG (Cho Admin và User - Có phân quyền trong route)
// =========================================================================
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    let filter = {};
    if (search) {
      // Tìm theo mã đơn (ObjectId) hoặc tên khách hàng
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      if (isValidObjectId) {
        filter._id = search;
      } else {
        filter["customerInfo.name"] = { $regex: search, $options: "i" };
      }
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      orders,
      totalPages,
      totalOrders,
      currentPage: page,
    });
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

// =========================================================================
// KIỂM TRA & TÍNH TOÁN MÃ GIẢM GIÁ (Dùng cho UI trang Thanh toán)
// =========================================================================
const checkCouponCheckout = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  
  const { couponCode, selectedItems } = req.body; 

  const validCoupon = await Coupon.findOne({ name: couponCode });
  if (!validCoupon) {
    return res.status(400).json({ error: "Mã giảm giá không hợp lệ hoặc đã hết hạn" });
  }

  const findUser = await User.findById(_id);
  const findCart = await Cart.findOne({ orderby: findUser._id });
  if (!findCart) return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });

  let calculateTotal = 0;

  // Chỉ tính tổng tiền của các sản phẩm khách hàng đang tick chọn
  if (selectedItems && selectedItems.length > 0) {
    selectedItems.forEach((selectedItem) => {
      const cartItem = findCart.products.find(
        (item) => 
          item.product.toString() === selectedItem.productId &&
          item.color === selectedItem.color &&
          item.storage === selectedItem.storage
      );
      if (cartItem) calculateTotal += cartItem.price * cartItem.count;
    });
  }

  if (calculateTotal === 0) {
      return res.status(400).json({ error: "Vui lòng chọn sản phẩm để áp dụng mã giảm giá" });
  }

  const discountAmount = (calculateTotal * validCoupon.discount) / 100;
  const totalAfterDiscount = calculateTotal - discountAmount;

  // TRẢ VỀ LUÔN, KHÔNG LƯU VÀO DATABASE
  res.json({ 
      totalBeforeDiscount: calculateTotal,
      totalAfterDiscount: totalAfterDiscount,
      discountAmount: discountAmount
  });
});

module.exports = {
  createOrder,
  adminCreateOrder,
  getOrderUser,
  updateStatus,
  getAllOrders,
  getOrderDetail,
  cancelOrder,
  deleteOrder,
  checkCouponCheckout
};