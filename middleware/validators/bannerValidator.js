// middleware/validators/bannerValidator.js
const { body, param } = require('express-validator');
const { validate } = require('./index');

const createBannerValidation = [
  body('title')
    .notEmpty().withMessage('Tiêu đề không được để trống')
    .isLength({ max: 100 }).withMessage('Tiêu đề không được quá 100 ký tự')
    .trim(),
  body('link')
    .optional()
    .isURL().withMessage('Link không hợp lệ')
    .trim(),
  body('position')
    .optional()
    .isIn(['top', 'bottom-left', 'bottom-right', 'center', 'left', 'right', 'popup'])
    .withMessage('Vị trí không hợp lệ'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Thứ tự phải là số nguyên không âm'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('Trạng thái phải là boolean'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  validate,
];

const updateBannerValidation = [
  param('id')
    .isMongoId().withMessage('ID banner không hợp lệ'),
  body('title')
    .optional()
    .isLength({ max: 100 }).withMessage('Tiêu đề không được quá 100 ký tự')
    .trim(),
  body('link')
    .optional()
    .isURL().withMessage('Link không hợp lệ')
    .trim(),
  body('position')
    .optional()
    .isIn(['top', 'bottom-left', 'bottom-right', 'center', 'left', 'right', 'popup'])
    .withMessage('Vị trí không hợp lệ'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Thứ tự phải là số nguyên không âm'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('Trạng thái phải là boolean'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  validate,
];

const deleteBannerValidation = [
  param('id')
    .isMongoId().withMessage('ID banner không hợp lệ'),
  validate,
];

module.exports = {
  createBannerValidation,
  updateBannerValidation,
  deleteBannerValidation,
};