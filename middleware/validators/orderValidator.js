// middleware/validators/orderValidator.js
const { body, param, query } = require('express-validator');
const { validate } = require('./index');

const createOrderValidation = [
  body('customerInfo.name')
    .notEmpty().withMessage('Tên khách hàng không được để trống')
    .trim(),
  body('customerInfo.phone')
    .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ')
    .trim(),
  body('customerInfo.address')
    .notEmpty().withMessage('Địa chỉ không được để trống')
    .trim(),
  body('paymentMethod')
    .isIn(['cod', 'bank_transfer', 'momo', 'vnpay', 'paypal', 'ZaloPay', 'ZaloPay (Simulated)'])
    .withMessage('Phương thức thanh toán không hợp lệ'),
  body('selectedItems')
    .isArray({ min: 1 }).withMessage('Phải chọn ít nhất một sản phẩm'),
  body('selectedItems.*.productId')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('selectedItems.*.color')
    .notEmpty().withMessage('Màu sắc không được để trống')
    .trim(),
  body('selectedItems.*.storage')
    .notEmpty().withMessage('Dung lượng không được để trống')
    .trim(),
  body('selectedItems.*.count')
    .isInt({ min: 1 }).withMessage('Số lượng phải lớn hơn 0'),
  body('couponCode')
    .optional()
    .isString().withMessage('Mã giảm giá phải là chuỗi')
    .trim()
    .toUpperCase(),
  validate,
];

const updateOrderStatusValidation = [
  param('id')
    .isMongoId().withMessage('ID đơn hàng không hợp lệ'),
  body('status')
    .isIn(['Not Processed', 'Confirmed', 'Processing', 'Dispatched', 'Cancelled', 'Delivered', 'Returned'])
    .withMessage('Trạng thái không hợp lệ'),
  body('paymentStatus')
    .optional()
    .isIn(['not_paid', 'paid', 'failed', 'refunded', 'authorized'])
    .withMessage('Trạng thái thanh toán không hợp lệ'),
  body('trackingNumber')
    .optional()
    .isString().withMessage('Mã vận đơn phải là chuỗi')
    .trim(),
  validate,
];

const getOrdersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Trang phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
  query('search')
    .optional()
    .isString().withMessage('Tìm kiếm phải là chuỗi')
    .trim(),
  validate,
];

module.exports = {
  createOrderValidation,
  updateOrderStatusValidation,
  getOrdersValidation,
};