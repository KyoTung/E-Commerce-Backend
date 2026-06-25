// middleware/validators/productValidator.js
const { body, param, query } = require('express-validator');
const { validate } = require('./index');

const variantValidation = [
  body('variants')
    .isArray({ min: 1 }).withMessage('Sản phẩm phải có ít nhất một biến thể'),
  body('variants.*.color')
    .notEmpty().withMessage('Màu sắc của biến thể không được để trống')
    .trim(),
  body('variants.*.storage')
    .notEmpty().withMessage('Dung lượng của biến thể không được để trống')
    .trim(),
  body('variants.*.price')
    .isFloat({ min: 0 }).withMessage('Giá của biến thể phải là số không âm'),
  body('variants.*.quantity')
    .isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên không âm'),
];

const createProductValidation = [
  body('title')
    .notEmpty().withMessage('Tiêu đề sản phẩm không được để trống')
    .isLength({ max: 200 }).withMessage('Tiêu đề không được quá 200 ký tự')
    .trim(),
  body('basePrice')
    .isFloat({ min: 0 }).withMessage('Giá cơ bản phải là số không âm'),
  body('brand')
    .notEmpty().withMessage('Thương hiệu không được để trống')
    .trim(),
  body('category')
    .notEmpty().withMessage('Danh mục không được để trống')
    .trim(),
  ...variantValidation,
  body('description')
    .optional()
    .isLength({ max: 5000 }).withMessage('Mô tả không được quá 5000 ký tự')
    .trim(),
  body('tags')
    .optional()
    .isArray().withMessage('Tags phải là mảng'),
  body('specifications')
    .optional()
    .isObject().withMessage('Thông số kỹ thuật phải là object'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive phải là boolean'),
  validate,
];

const updateProductValidation = [
  param('id')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('title')
    .optional()
    .isLength({ max: 200 }).withMessage('Tiêu đề không được quá 200 ký tự')
    .trim(),
  body('basePrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá cơ bản phải là số không âm'),
  body('brand')
    .optional()
    .notEmpty().withMessage('Thương hiệu không được để trống')
    .trim(),
  body('category')
    .optional()
    .notEmpty().withMessage('Danh mục không được để trống')
    .trim(),
  body('variants')
    .optional()
    .isArray({ min: 1 }).withMessage('Sản phẩm phải có ít nhất một biến thể'),
  body('variants.*.color')
    .optional()
    .notEmpty().withMessage('Màu sắc của biến thể không được để trống')
    .trim(),
  body('variants.*.storage')
    .optional()
    .notEmpty().withMessage('Dung lượng của biến thể không được để trống')
    .trim(),
  body('variants.*.price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá của biến thể phải là số không âm'),
  body('variants.*.quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên không âm'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive phải là boolean'),
  validate,
];

const deleteProductValidation = [
  param('id')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  validate,
];

const getProductsValidation = [
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
  query('brand')
    .optional()
    .isString().withMessage('Thương hiệu phải là chuỗi')
    .trim(),
  query('category')
    .optional()
    .isString().withMessage('Danh mục phải là chuỗi')
    .trim(),
  validate,
];

module.exports = {
  createProductValidation,
  updateProductValidation,
  deleteProductValidation,
  getProductsValidation,
};