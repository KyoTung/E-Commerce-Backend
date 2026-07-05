// middleware/validators/couponValidator.js
const { body, param } = require('express-validator');
const { validate } = require('./index');

const createCouponValidation = [
  body('name')
    .notEmpty().withMessage('Tên mã giảm giá không được để trống')
    .isLength({ min: 3, max: 20 }).withMessage('Mã giảm giá phải từ 3 đến 20 ký tự')
    .trim()
    .toUpperCase(),
  body('discount')
    .isFloat({ min: 1, max: 100 }).withMessage('Giảm giá phải từ 1% đến 100%'),
  body('expiry')
    .isISO8601().withMessage('Ngày hết hạn không hợp lệ')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Ngày hết hạn phải lớn hơn ngày hiện tại');
      }
      return true;
    }),
  validate,
];

const updateCouponValidation = [
  param('id')
    .isMongoId().withMessage('ID coupon không hợp lệ'),
  body('name')
    .optional()
    .isLength({ min: 3, max: 20 }).withMessage('Mã giảm giá phải từ 3 đến 20 ký tự')
    .trim()
    .toUpperCase(),
  body('discount')
    .optional()
    .isFloat({ min: 1, max: 100 }).withMessage('Giảm giá phải từ 1% đến 100%'),
  body('expiry')
    .optional()
    .isISO8601().withMessage('Ngày hết hạn không hợp lệ')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Ngày hết hạn phải lớn hơn ngày hiện tại');
      }
      return true;
    }),
  validate,
];

const deleteCouponValidation = [
  param('id')
    .isMongoId().withMessage('ID coupon không hợp lệ'),
  validate,
];

const applyCouponValidation = [
  body('coupon')
    .notEmpty().withMessage('Mã giảm giá không được để trống')
    .trim()
    .toUpperCase(),
  validate,
];

module.exports = {
  createCouponValidation,
  updateCouponValidation,
  deleteCouponValidation,
  applyCouponValidation,
};