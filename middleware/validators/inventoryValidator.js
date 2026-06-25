// middleware/validators/inventoryValidator.js
const { body, param, query } = require('express-validator');
const { validate } = require('./index');

const importStockValidation = [
  body('supplier')
    .isMongoId().withMessage('ID nhà cung cấp không hợp lệ'),
  body('items')
    .isArray({ min: 1 }).withMessage('Phải có ít nhất một sản phẩm nhập'),
  body('items.*.product')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('items.*.color')
    .notEmpty().withMessage('Màu sắc không được để trống')
    .trim(),
  body('items.*.storage')
    .notEmpty().withMessage('Dung lượng không được để trống')
    .trim(),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Số lượng nhập phải lớn hơn 0'),
  body('items.*.importPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá nhập phải là số không âm'),
  body('note')
    .optional()
    .isString().withMessage('Ghi chú phải là chuỗi')
    .trim(),
  validate,
];

const exportStockValidation = [
  body('items')
    .isArray({ min: 1 }).withMessage('Phải có ít nhất một sản phẩm xuất'),
  body('items.*.product')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('items.*.color')
    .notEmpty().withMessage('Màu sắc không được để trống')
    .trim(),
  body('items.*.storage')
    .notEmpty().withMessage('Dung lượng không được để trống')
    .trim(),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Số lượng xuất phải lớn hơn 0'),
  body('exportType')
    .isIn(['return_to_supplier', 'internal_use', 'damage', 'adjustment'])
    .withMessage('Loại xuất không hợp lệ'),
  body('supplier')
    .if(body('exportType').equals('return_to_supplier'))
    .isMongoId().withMessage('Vui lòng chọn nhà cung cấp khi trả hàng'),
  body('note')
    .optional()
    .isString().withMessage('Ghi chú phải là chuỗi')
    .trim(),
  validate,
];

const getStockValidation = [
  query('search')
    .optional()
    .isString().withMessage('Tìm kiếm phải là chuỗi')
    .trim(),
  query('threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Ngưỡng phải là số nguyên không âm'),
  validate,
];

const cancelImportValidation = [
  param('id')
    .isMongoId().withMessage('ID phiếu nhập không hợp lệ'),
  validate,
];

module.exports = {
  importStockValidation,
  exportStockValidation,
  getStockValidation,
  cancelImportValidation,
};