const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Cart = require("../models/CartModel");
const InventoryTransaction = require("../models/InventoryTransactionModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
var uniqid = require("uniqid");
const mongoose = require("mongoose");
const { isValidIMEI } = require('../middleware/validators/imeiValidator');

// =========================================================================
//  TẠO ĐƠN HÀNG - Khách hàng tạo đơn (Có transaction + ghi nhận giao dịch bán hàng)
// =========================================================================
const createOrder = asyncHandler(async (req, res) => {
  const {
    paymentMethod,
    couponCode,
    shippingFee,
    customerInfo,
    selectedItems,
  } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate cơ bản
    const allowedMethods = [
      "cod",
      "bank_transfer",
      "momo",
      "vnpay",
      "paypal",
      "ZaloPay",
    ];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid payment method" });
    }
    if (
      !customerInfo ||
      !customerInfo.name ||
      !customerInfo.address ||
      !customerInfo.phone
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Missing customer information" });
    }

    const findUser = await User.findById(_id).session(session);
    const findCart = await Cart.findOne({ orderby: findUser._id })
      .populate("products.product")
      .session(session);

    if (!findCart || findCart.products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Cart is empty or not found" });
    }

    // Lọc sản phẩm thanh toán
    const itemsToCheckout =
      selectedItems && selectedItems.length > 0
        ? findCart.products.filter((cartItem) =>
            selectedItems.some(
              (selectedItem) =>
                selectedItem.productId === cartItem.product._id.toString() &&
                selectedItem.color === cartItem.color &&
                selectedItem.storage === cartItem.storage,
            ),
          )
        : findCart.products;

    if (itemsToCheckout.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Không tìm thấy sản phẩm hợp lệ để thanh toán" });
    }

    let calculateTotal = 0;
    // Kiểm tra tồn kho & Tính tiền
    for (const item of itemsToCheckout) {
      const product = await Product.findById(item.product._id).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ error: `Không tìm thấy sản phẩm ID: ${item.product._id}` });
      }

      const selectedVariant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage,
      );
      if (!selectedVariant) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({
            error: `Không tồn tại phân loại ${item.color} - ${item.storage} cho sản phẩm ${product.title}`,
          });
      }
      if (selectedVariant.quantity < item.count) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: `Sản phẩm ${product.title} không đủ hàng` });
      }
      calculateTotal += item.price * item.count;
    }

    // Xử lý mã giảm giá
    let discountAmount = 0;
    let isCouponApplied = false;
    if (couponCode) {
      const validCoupon = await Coupon.findOne({ name: couponCode }).session(
        session,
      );
      if (!validCoupon) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Mã giảm giá không hợp lệ" });
      }
      discountAmount = (calculateTotal * validCoupon.discount) / 100;
      isCouponApplied = true;
    }

    const safeShippingFee = shippingFee || 0;
    const finalAmount = calculateTotal - discountAmount + safeShippingFee;

    // Tất cả đơn hàng đều tạo với trạng thái chưa thanh toán
    // Sau này sẽ cập nhật qua callback hoặc simulate khi thanh toán thành công
    const orderStatus = "Not Processed";
    const paymentStatus = "not_paid";
    const paymentIntentStatus = "pending";

    // Tạo đơn hàng
    const newOrder = new Order({
      products: itemsToCheckout.map((item) => ({
        product: item.product._id,
        count: item.count,
        color: item.color,
        storage: item.storage,
        price: item.price,
        imeiOrSerial: null,
      })),
      paymentIntent: {
        id: uniqid(),
        method: paymentMethod,
        amount: finalAmount,
        currency: "VND",
        status: paymentIntentStatus,
      },
      orderby: findUser._id,
      paymentMethod,
      orderStatus,
      paymentStatus,
      total: finalAmount,
      couponApplied: isCouponApplied,
      discountAmount: discountAmount,
      shippingFee: safeShippingFee,
      customerInfo,
    });
    await newOrder.save({ session });

    // Cập nhật kho (trừ quantity, tăng sold) - vẫn trừ kho ngay khi đặt hàng (giữ nguyên logic)
    const stockUpdates = itemsToCheckout.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product._id,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage },
          },
        },
        update: {
          $inc: {
            "variants.$.quantity": -item.count,
            "variants.$.sold": +item.count,
          },
        },
      },
    }));
    await Product.bulkWrite(stockUpdates, { session });

    // Ghi nhận giao dịch bán hàng (SALE) vào InventoryTransaction
    const transactionItems = itemsToCheckout.map((item) => ({
      product: item.product._id,
      color: item.color,
      storage: item.storage,
      quantity: item.count,
      price: item.price,
      importPrice: 0,
    }));
    const totalSaleValue = itemsToCheckout.reduce(
      (sum, i) => sum + i.price * i.count,
      0,
    );
    await InventoryTransaction.create(
      [
        {
          transactionType: "SALE",
          referenceId: newOrder._id,
          items: transactionItems,
          totalValue: totalSaleValue,
          note: `Đơn hàng #${newOrder._id} - ${customerInfo.name}`,
          createdBy: _id,
          status: "completed",
        },
      ],
      { session },
    );

    // Dọn giỏ hàng (xóa các sản phẩm đã mua)
    const remainingItems = findCart.products.filter(
      (cartItem) =>
        !itemsToCheckout.some(
          (purchasedItem) =>
            purchasedItem.product._id.toString() ===
              cartItem.product._id.toString() &&
            purchasedItem.color === cartItem.color &&
            purchasedItem.storage === cartItem.storage,
        ),
    );
    if (remainingItems.length === 0) {
      await Cart.findByIdAndDelete(findCart._id).session(session);
    } else {
      findCart.products = remainingItems;
      findCart.cartTotal = remainingItems.reduce(
        (total, item) => total + item.price * item.count,
        0,
      );
      findCart.totalAfterDiscount = undefined;
      await findCart.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Đặt hàng thành công",
      order: newOrder,
      // Thêm flag để frontend biết có cần hiển thị modal thanh toán không
      requiresPayment:
        paymentMethod === "ZaloPay" || paymentMethod === "ZaloPay (Simulated)",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create order error:", error);
    res
      .status(500)
      .json({ error: "Thanh toán thất bại", details: error.message });
  }
});

// =========================================================================
// TẠO ĐƠN HÀNG THỦ CÔNG - ADMIN (Có transaction + ghi SALE transaction)
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
  const adminId = req.user._id;
  validateMongoDbId(adminId);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!orderItems || orderItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Đơn hàng phải có ít nhất 1 sản phẩm" });
    }

    let calculateTotal = 0;
    const orderProducts = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ error: `Không tìm thấy sản phẩm ID: ${item.product}` });
      }

      const selectedVariant = product.variants.find(
        (v) => v.color === item.color && v.storage === item.storage,
      );
      if (!selectedVariant) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({
            error: `Không tồn tại phân loại ${item.color} - ${item.storage}`,
          });
      }
      if (selectedVariant.quantity < item.count) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({
            error: `Sản phẩm ${product.title} chỉ còn ${selectedVariant.quantity}`,
          });
      }

      const realPrice = selectedVariant.price;
      calculateTotal += realPrice * item.count;
      orderProducts.push({
        product: product._id,
        count: item.count,
        color: item.color,
        storage: item.storage,
        price: realPrice,
        imeiOrSerial: null,
      });
    }

    const finalAmount =
      calculateTotal + (shippingFee || 0) - (discountAmount || 0);
    const newOrder = new Order({
      products: orderProducts,
      orderby: adminId,
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

    // Cập nhật kho
    const stockUpdates = orderItems.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage },
          },
        },
        update: {
          $inc: {
            "variants.$.quantity": -item.count,
            "variants.$.sold": +item.count,
          },
        },
      },
    }));
    await Product.bulkWrite(stockUpdates, { session });

    // Ghi transaction SALE cho đơn hàng admin tạo
    const transactionItems = orderItems.map((item) => ({
      product: item.product,
      color: item.color,
      storage: item.storage,
      quantity: item.count,
      price: 0, // không có giá bán từ frontend, có thể lấy từ product nếu cần
      importPrice: 0,
    }));
    await InventoryTransaction.create(
      [
        {
          transactionType: "SALE",
          referenceId: newOrder._id,
          items: transactionItems,
          totalValue: 0,
          note: `Admin tạo đơn #${newOrder._id} - ${customerInfo.name}`,
          createdBy: adminId,
          status: "completed",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res
      .status(201)
      .json({
        success: true,
        message: "Tạo đơn hàng thành công",
        order: newOrder,
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Admin Create Order Error:", error);
    res
      .status(500)
      .json({ error: "Lỗi hệ thống khi tạo đơn hàng", details: error.message });
  }
});

// =========================================================================
//  CẬP NHẬT TRẠNG THÁI (Admin - Khi hủy/trả hàng thì hoàn kho + ghi log return)
// =========================================================================
const updateStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus, paymentIntentStatus } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);

  const statusTransitions = {
    "Not Processed": ["Confirmed", "Cancelled"],
    Confirmed: ["Processing", "Cancelled"],
    Processing: ["Dispatched", "Cancelled"],
    //"Dispatched": ["Delivered", "Cancelled", "Returned"],
    Dispatched: ["Delivered"],
    Delivered: ["Returned"],
    Cancelled: [],
    Returned: [],
  };

  const allowedPaymentStatus = [
    "not_paid",
    "paid",
    "failed",
    "refunded",
    "authorized",
  ];
  if (paymentStatus && !allowedPaymentStatus.includes(paymentStatus)) {
    throw new Error("Invalid payment status");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingOrder = await Order.findById(id).session(session);
    if (!existingOrder) throw new Error("Order not found");

    const currentStatus = existingOrder.orderStatus;
    if (status && status !== currentStatus) {
      const allowedNextStatuses = statusTransitions[currentStatus] || [];
      if (!allowedNextStatuses.includes(status)) {
        throw new Error(
          `Invalid status update: Cannot change from '${currentStatus}' to '${status}'.`,
        );
      }
    }

    
    // Kiểm tra IMEI khi chuyển từ Processing sang Dispatched
    if (currentStatus === "Processing" && status === "Dispatched") {
      const missingImei = existingOrder.products.filter((p) => !p.imeiOrSerial);
      if (missingImei.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: "Vui lòng nhập IMEI cho tất cả sản phẩm trước khi chuyển sang trạng thái Đang giao hàng",
          missing: missingImei.map((p) => p.product.title || "Sản phẩm không xác định"),
        });
      }
    }


    // Xử lý hoàn kho khi chuyển sang Cancelled hoặc Returned
    const isTransitioningToReturned =
      status === "Returned" && currentStatus !== "Returned";
    const isTransitioningToCancelled =
      status === "Cancelled" && currentStatus !== "Cancelled";

    if (isTransitioningToReturned || isTransitioningToCancelled) {
      const bulkOps = existingOrder.products.map((item) => ({
        updateOne: {
          filter: {
            _id: item.product,
            variants: {
              $elemMatch: { color: item.color, storage: item.storage },
            },
          },
          update: {
            $inc: {
              "variants.$.quantity": +item.count,
              "variants.$.sold": -item.count,
            },
          },
        },
      }));
      await Product.bulkWrite(bulkOps, { session });

      // Ghi transaction return
      const returnItems = existingOrder.products.map((item) => ({
        product: item.product,
        color: item.color,
        storage: item.storage,
        quantity: item.count,
        price: 0,
        importPrice: 0,
      }));
      await InventoryTransaction.create(
        [
          {
            transactionType: "RETURN",
            referenceId: existingOrder._id,
            items: returnItems,
            totalValue: 0,
            note: `${status === "Cancelled" ? "Hủy đơn" : "Trả hàng"} #${existingOrder._id}`,
            createdBy: req.user._id,
            status: "completed",
          },
        ],
        { session },
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status || currentStatus,
        paymentStatus: paymentStatus || existingOrder.paymentStatus,
        paymentIntent: {
          status:
            paymentIntentStatus !== undefined
              ? paymentIntentStatus
              : existingOrder.paymentIntent?.status,
        },
      },
      { new: true, session },
    );

    await session.commitTransaction();
    session.endSession();
    res.json({
      message: "Cập nhật trạng thái thành công",
      updateOrder: updatedOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error.message || error);
  }
});

// =========================================================================
//. HỦY ĐƠN HÀNG (Client tự hủy - Hoàn kho + ghi return transaction)
// =========================================================================
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;
  validateMongoDbId(id);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const findOrder = await Order.findById(id).session(session);
    if (!findOrder) throw new Error("Không tìm thấy đơn hàng");
    if (findOrder.orderby.toString() !== _id.toString()) {
      throw new Error("Bạn không có quyền hủy đơn hàng của người khác");
    }
    const allowedStatusToCancel = ["Not Processed", "Confirmed"];
    if (!allowedStatusToCancel.includes(findOrder.orderStatus)) {
      throw new Error(
        `Không thể hủy đơn hàng đang ở trạng thái: ${findOrder.orderStatus}.`,
      );
    }

    // Hoàn kho
    const bulkOps = findOrder.products.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage },
          },
        },
        update: {
          $inc: {
            "variants.$.quantity": +item.count,
            "variants.$.sold": -item.count,
          },
        },
      },
    }));
    await Product.bulkWrite(bulkOps, { session });

    // Ghi transaction return
    const returnItems = findOrder.products.map((item) => ({
      product: item.product,
      color: item.color,
      storage: item.storage,
      quantity: item.count,
      price: 0,
      importPrice: 0,
    }));
    await InventoryTransaction.create(
      [
        {
          transactionType: "RETURN",
          referenceId: findOrder._id,
          items: returnItems,
          totalValue: 0,
          note: `Người dùng hủy đơn #${findOrder._id}`,
          createdBy: _id,
          status: "completed",
        },
      ],
      { session },
    );

    const cancelledOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus: "Cancelled" },
      { new: true, session },
    );

    await session.commitTransaction();
    session.endSession();
    res.json({ message: "Hủy đơn hàng thành công", cancelledOrder });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error);
  }
});

// =========================================================================
// XÓA ĐƠN HÀNG (Admin xóa cứng - Hoàn kho + ghi return transaction)
// =========================================================================
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: id, orderby: _id }).session(
      session,
    );
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    const bulkOps = order.products.map((item) => ({
      updateOne: {
        filter: {
          _id: item.product,
          variants: {
            $elemMatch: { color: item.color, storage: item.storage },
          },
        },
        update: {
          $inc: {
            "variants.$.quantity": +item.count,
            "variants.$.sold": -item.count,
          },
        },
      },
    }));
    await Product.bulkWrite(bulkOps, { session });

    // Ghi transaction return (vì xóa đơn cũng là hoàn lại hàng)
    const returnItems = order.products.map((item) => ({
      product: item.product,
      color: item.color,
      storage: item.storage,
      quantity: item.count,
      price: 0,
      importPrice: 0,
    }));
    await InventoryTransaction.create(
      [
        {
          transactionType: "RETURN",
          referenceId: order._id,
          items: returnItems,
          totalValue: 0,
          note: `Admin xóa đơn #${order._id}`,
          createdBy: _id,
          status: "completed",
        },
      ],
      { session },
    );

    await Order.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Order deleted and stock restored" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error);
  }
});

// lấy danh sách đơn hàng cho ADMIN
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const orderStatus = req.query.orderStatus;
    const paymentStatus = req.query.paymentStatus;
    const minPrice = parseFloat(req.query.minPrice);
    const maxPrice = parseFloat(req.query.maxPrice);

    let filter = {};

    // Tìm kiếm theo mã đơn hoặc tên khách hàng
    if (search) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      if (isValidObjectId) {
        filter._id = search;
      } else {
        filter["customerInfo.name"] = { $regex: search, $options: "i" };
      }
    }

    // Lọc theo trạng thái đơn hàng
    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    // Lọc theo trạng thái thanh toán
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Lọc theo khoảng giá (dựa trên trường `total`)
    if (!isNaN(minPrice) && !isNaN(maxPrice)) {
      filter.total = { $gte: minPrice, $lte: maxPrice };
    } else if (!isNaN(minPrice)) {
      filter.total = { $gte: minPrice };
    } else if (!isNaN(maxPrice)) {
      filter.total = { $lte: maxPrice };
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({ orders, totalPages, totalOrders, currentPage: page });
  } catch (error) {
    throw new Error(error);
  }
});

// lấy danh sách đơn hàng cho CLIENT
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
    res.json(order || { message: "No orders yet" });
  } catch (error) {
    throw new Error(error);
  }
});

// lấy thông tin chi tiết của 1 đơn hàng, cả ADMIN và CLIENT
const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const order = await Order.findById(id).populate({
      path: "products.product",
      select: "title images price variants",
    });
    res.json(order || { message: "No orders yet" });
  } catch (error) {
    throw new Error(error);
  }
});

// =========================================================================
// KIỂM TRA & TÍNH TOÁN MÃ GIẢM GIÁ 
// =========================================================================
const checkCouponCheckout = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  const { couponCode, selectedItems } = req.body;
  const validCoupon = await Coupon.findOne({ name: couponCode });
  if (!validCoupon)
    return res
      .status(400)
      .json({ error: "Mã giảm giá không hợp lệ hoặc đã hết hạn" });

  const findUser = await User.findById(_id);
  const findCart = await Cart.findOne({ orderby: findUser._id });
  if (!findCart)
    return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });

  let calculateTotal = 0;
  if (selectedItems && selectedItems.length > 0) {
    selectedItems.forEach((selectedItem) => {
      const cartItem = findCart.products.find(
        (item) =>
          item.product.toString() === selectedItem.productId &&
          item.color === selectedItem.color &&
          item.storage === selectedItem.storage,
      );
      if (cartItem) calculateTotal += cartItem.price * cartItem.count;
    });
  }
  if (calculateTotal === 0)
    return res
      .status(400)
      .json({ error: "Vui lòng chọn sản phẩm để áp dụng mã giảm giá" });

  const discountAmount = (calculateTotal * validCoupon.discount) / 100;
  const totalAfterDiscount = calculateTotal - discountAmount;
  res.json({
    totalBeforeDiscount: calculateTotal,
    totalAfterDiscount,
    discountAmount,
  });
});

// Thêm IMEI khi cập nhật đơn hàng
const updateImei = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imeiList } = req.body; // [{ productIndex, imei }, ...]

  // 1. Kiểm tra dữ liệu đầu vào
  if (!imeiList || !Array.isArray(imeiList) || imeiList.length === 0) {
    return res.status(400).json({
      error: "Danh sách IMEI không hợp lệ",
    });
  }

  // 2. Tìm đơn hàng và populate product để lấy title
  const order = await Order.findById(id).populate("products.product");
  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
  }

  // 3. Kiểm tra trạng thái cho phép
  const allowedStatuses = ["Not Processed", "Confirmed", "Processing"];
  if (!allowedStatuses.includes(order.orderStatus)) {
    return res.status(400).json({
      error: "Không thể cập nhật IMEI ở trạng thái hiện tại",
      currentStatus: order.orderStatus,
    });
  }

  // 4. Cập nhật IMEI cho từng sản phẩm
  const errors = [];
  imeiList.forEach(({ productIndex, imei }) => {
    // Kiểm tra chỉ số hợp lệ
    if (typeof productIndex !== "number" || productIndex < 0 || productIndex >= order.products.length) {
      errors.push(`Sản phẩm thứ ${productIndex} không tồn tại`);
      return;
    }

    const product = order.products[productIndex];
    if (!product) {
      errors.push(`Sản phẩm thứ ${productIndex} không tồn tại`);
      return;
    }

    // Kiểm tra IMEI không được để trống (nếu bắt buộc)
    const trimmedImei = imei?.trim();
    if (!trimmedImei) {
      errors.push(`IMEI cho sản phẩm "${product.product?.title || "không xác định"}" không được để trống`);
      return;
    }

     // Kiểm tra định dạng IMEI
    if (!isValidIMEI(trimmedImei, false)) {   // false = không kiểm tra Luhn
     errors.push(`IMEI "${trimmedImei}" không hợp lệ (phải là 14-16 chữ số)`);
      return;
    }


    // kiểm tra IMEI trùng lặp trong cùng đơn hàng
    const existing = order.products.some((p, idx) => idx !== productIndex && p.imeiOrSerial === trimmedImei);
    if (existing) { errors.push(`IMEI "${trimmedImei}" đã được sử dụng trong đơn hàng này`); return; }

    product.imeiOrSerial = trimmedImei;
  });

  // Nếu có lỗi validation, trả về lỗi mà không lưu
  if (errors.length > 0) {
    return res.status(400).json({
      error: "Có lỗi xảy ra khi cập nhật IMEI",
      details: errors,
    });
  }

  // 5. Lưu đơn hàng
  await order.save();

  // 6. Trả về kết quả (có thể trả về danh sách IMEI đã cập nhật)
  res.json({
    success: true,
    message: "Cập nhật IMEI thành công",
    order: {
      _id: order._id,
      products: order.products.map((p) => ({
        product: p.product?._id,
        title: p.product?.title,
        imeiOrSerial: p.imeiOrSerial,
      })),
    },
  });
});

 // Tra cứu bảo hành theo IMEI
const getOrderByImei = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Thiếu IMEI" });

  const order = await Order.findOne({
    "products.imeiOrSerial": id,
  }).populate("products.product", "title images");

  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy sản phẩm với IMEI này" });
  }

  // Lọc ra sản phẩm cụ thể
  const product = order.products.find(p => p.imeiOrSerial === id);

  res.json({
    product: product.product,
    orderId: order._id,
    orderDate: order.createdAt,
    customerName: order.customerInfo.name,
    customerPhone: order.customerInfo.phone,
    warrantyExpiry: new Date(order.createdAt).setFullYear(order.createdAt.getFullYear() + 1), // 1 năm
    status: order.orderStatus,
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
  checkCouponCheckout,
  updateImei,
  getOrderByImei, 
};
