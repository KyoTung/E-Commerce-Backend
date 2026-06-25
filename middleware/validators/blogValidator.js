// middleware/validators/blogValidator.js
const { body, param } = require('express-validator');
const { validate } = require('./index');

const createBlogValidation = [
  body('title')
    .notEmpty().withMessage('Tiêu đề không được để trống')
    .isLength({ max: 200 }).withMessage('Tiêu đề không được quá 200 ký tự')
    .trim(),
  body('description')
    .notEmpty().withMessage('Mô tả không được để trống')
    .isLength({ max: 500 }).withMessage('Mô tả không được quá 500 ký tự')
    .trim(),
  body('category')
    .notEmpty().withMessage('Danh mục không được để trống')
    .trim(),
  body('images')
    .optional()
    .isArray().withMessage('Ảnh phải là mảng'),
  body('author')
    .optional()
    .isString().withMessage('Tác giả phải là chuỗi')
    .trim(),
  body('tags')
    .optional()
    .isArray().withMessage('Tags phải là mảng'),
  validate,
];

const updateBlogValidation = [
  param('id')
    .isMongoId().withMessage('ID bài viết không hợp lệ'),
  body('title')
    .optional()
    .isLength({ max: 200 }).withMessage('Tiêu đề không được quá 200 ký tự')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Mô tả không được quá 500 ký tự')
    .trim(),
  body('category')
    .optional()
    .notEmpty().withMessage('Danh mục không được để trống')
    .trim(),
  body('images')
    .optional()
    .isArray().withMessage('Ảnh phải là mảng'),
  body('author')
    .optional()
    .isString().withMessage('Tác giả phải là chuỗi')
    .trim(),
  validate,
];

const deleteBlogValidation = [
  param('id')
    .isMongoId().withMessage('ID bài viết không hợp lệ'),
  validate,
];

const likeDislikeBlogValidation = [
  body('blogId')
    .isMongoId().withMessage('ID bài viết không hợp lệ'),
  validate,
];

module.exports = {
  createBlogValidation,
  updateBlogValidation,
  deleteBlogValidation,
  likeDislikeBlogValidation,
};