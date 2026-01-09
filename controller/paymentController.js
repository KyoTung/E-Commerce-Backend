const asyncHandler = require("express-async-handler");
const axios = require("axios");
const CryptoJS = require("crypto-js");
const moment = require("moment");
const User = require("../models/UserModel");
const Order = require("../models/OrderModel");

// --- CẤU HÌNH ZALOPAY SANDBOX ---
const config = {
  app_id: 554, // AppID mới (Lưu ý: Để dạng Số)
  key1: "8NdU5pG5R2spGHGhyO99HN1OhD8IQJBn",
  key2: "uUfsWgfLkRLzq6W2uNXTCxrfxs51auny",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

const newPayment = asyncHandler(async (req, res) => {
  const { orderId, totalAmount } = req.body;

  const embed_data = {
    redirecturl: `${process.env.CLIENT_URL}/order-confirmation/${orderId}`,
  };

  const items = []; // Sandbox nên để mảng rỗng
  const transID = Math.floor(Math.random() * 1000000);

  const order = {
    app_id: config.app_id,
    app_user: "NestStore_User",
    app_time: Date.now(), // miliseconds
    amount: parseInt(totalAmount), // Số nguyên
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
    embed_data: JSON.stringify(embed_data),
    item: JSON.stringify(items),
    description: `Thanh toan don hang #${transID}`,
    bank_code: "", // Để trống để cho người dùng chọn ngân hàng
    callback_url: `${process.env.SERVER_URL}/api/order/zalopay_callback`
  };

  // Tạo MAC
  const data =
    config.app_id +
    "|" +
    order.app_trans_id +
    "|" +
    order.app_user +
    "|" +
    order.amount +
    "|" +
    order.app_time +
    "|" +
    order.embed_data +
    "|" +
    order.item;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    // Gửi request dạng Form
    const params = new URLSearchParams();
    params.append("app_id", order.app_id);
    params.append("app_user", order.app_user);
    params.append("app_time", order.app_time);
    params.append("amount", order.amount);
    params.append("app_trans_id", order.app_trans_id);
    params.append("embed_data", order.embed_data);
    params.append("item", order.item);
    params.append("description", order.description);
    params.append("bank_code", order.bank_code);
    params.append("callback_url", order.callback_url);
    params.append("mac", order.mac);

    const result = await axios.post(config.endpoint, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("ZaloPay Result:", result.data);

    if (result.data.return_code === 1) {
      res.status(200).json(result.data);
    } else {
      res.status(400).json(result.data);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. XỬ LÝ CALLBACK (ZaloPay gọi về Server mình)
const callback = async (req, res) => {
  let result = {};
  console.log("--> Callback received from ZaloPay:", req.body);

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    // Dùng key2 để kiểm tra tính hợp lệ (AppID 554 dùng key2 này)
    let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    // 1. Kiểm tra chữ ký (Để đảm bảo là ZaloPay gửi, không phải hacker)
    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      // 2. Chữ ký hợp lệ -> Giải mã dữ liệu
      let dataJson = JSON.parse(dataStr);

      // dataJson chứa: { app_trans_id, amount, embed_data, ... }
      console.log("Payment success for transID:", dataJson["app_trans_id"]);

      // Lấy Order ID từ embed_data (lúc tạo payment mình đã nhét vào)
      // Lưu ý: embed_data ZaloPay trả về là chuỗi JSON, cần parse lần nữa
      const embedData = JSON.parse(dataJson["embed_data"]);
      const orderId = embedData.redirecturl.split("/").pop(); // Hack nhẹ để lấy ID từ URL redirect, hoặc tốt nhất là lúc tạo payment bạn gửi orderId vào embed_data dạng { orderId: "..." }

      // 3. Cập nhật Database
      const order = await Order.findById(orderId);
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: dataJson["zp_trans_id"],
          status: "Success",
          update_time: Date.now().toString(),
          email_address: "zalopay_sandbox@test.com",
        };

        if (order.paymentIntent) {
          order.paymentIntent.status = "paid";
        }
        order.orderStatus = "Processing"; //trạng thái sau khi thanh toán
        order.paymentStatus = "paid"; //trạng thái thanh toán
        await order.save();
        console.log(`Updated Order ${orderId} to Paid`);
      }

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    console.log("Error Callback:", ex.message);
    result.return_code = 0;
    result.return_message = ex.message;
  }

  // Phản hồi lại cho ZaloPay
  res.json(result);
};

const simulateSuccess = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Không tìm thấy đơn hàng");
  }

  // Cập nhật trạng thái y hệt như lúc nhận Callback thật
  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentIntent = {
    method: "ZaloPay", // Đánh dấu là giả lập để dễ phân biệt
    status: "paid",
    amount: order.total,
    currency: "VND",
    id: `SIMULATED_${Date.now()}`
  };
  order.orderStatus = "Processing";
  order.paymentStatus = "paid";

  await order.save();

  res.status(200).json({ success: true, message: "Đã kích hoạt thanh toán thành công (Demo Mode)" });
});

module.exports = { newPayment, callback, simulateSuccess };