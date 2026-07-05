// middleware/validators/masterDataValidator.js
const { body, param } = require('express-validator');
const { validate } = require('./index');

const createMasterValidation = [
  body('title')
    .notEmpty().withMessage('Tên không được để trống')
    .isLength({ max: 50 }).withMessage('Tên không được quá 50 ký tự')
    .trim(),
  body('slug')
    .optional()
    .isString().withMessage('Slug phải là chuỗi')
    .trim()
    .toLowerCase(),
  validate,
];

const updateMasterValidation = [
  param('id')
    .isMongoId().withMessage('ID không hợp lệ'),
  body('title')
    .optional()
    .isLength({ max: 50 }).withMessage('Tên không được quá 50 ký tự')
    .trim(),
  body('slug')
    .optional()
    .isString().withMessage('Slug phải là chuỗi')
    .trim()
    .toLowerCase(),
  validate,
];

const deleteMasterValidation = [
  param('id')
    .isMongoId().withMessage('ID không hợp lệ'),
  validate,
];

module.exports = {
  createMasterValidation,
  updateMasterValidation,
  deleteMasterValidation,
};