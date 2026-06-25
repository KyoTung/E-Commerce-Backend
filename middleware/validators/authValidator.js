// middleware/validators/authValidator.js
const { body } = require('express-validator');
const { validate } = require('./index');

const registerValidation = [
  body('fullName')
    .notEmpty().withMessage('Họ tên không được để trống')
    .isLength({ min: 2, max: 50 }).withMessage('Họ tên phải từ 2 đến 50 ký tự')
    .trim(),
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
  body('phone')
    .optional()
    .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ')
    .trim(),
  validate,
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống'),
  validate,
];

const forgotPasswordValidation = [
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .trim(),
  validate,
];

const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Token không được để trống'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};