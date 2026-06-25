// middleware/validators/userValidator.js
const { body, param } = require('express-validator');
const { validate } = require('./index');

const createUserValidation = [
  body('fullName')
    .notEmpty().withMessage('Họ tên không được để trống')
    .isLength({ min: 2, max: 50 }).withMessage('Họ tên phải từ 2 đến 50 ký tự')
    .trim(),
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('phone')
    .optional()
    .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ')
    .trim(),
  body('role')
    .optional()
    .isIn(['user', 'staff', 'admin']).withMessage('Vai trò không hợp lệ'),
  body('address')
    .optional()
    .isLength({ max: 200 }).withMessage('Địa chỉ không được quá 200 ký tự')
    .trim(),
  validate,
];

const updateUserValidation = [
  param('id')
    .isMongoId().withMessage('ID người dùng không hợp lệ'),
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Họ tên phải từ 2 đến 50 ký tự')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ')
    .trim(),
  body('role')
    .optional()
    .isIn(['user', 'staff', 'admin']).withMessage('Vai trò không hợp lệ'),
  body('address')
    .optional()
    .isLength({ max: 200 }).withMessage('Địa chỉ không được quá 200 ký tự')
    .trim(),
  body('isBlock')
    .optional()
    .isBoolean().withMessage('isBlock phải là boolean'),
  validate,
];

const blockUserValidation = [
  param('id')
    .isMongoId().withMessage('ID người dùng không hợp lệ'),
  validate,
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  blockUserValidation,
};