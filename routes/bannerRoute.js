const express = require('express');
const { authMiddleware, isStaff, isStaff } = require('../middleware/authMiddleWare');
const { uploadPhoto } = require('../middleware/uploadImage'); // chỉ multer, không sharp
const {
  createBanner,
  uploadBannerImage,
  deleteBannerImage,
  updateBanner,
  deleteBanner,
  getBannersAdmin,
  getActiveBanners,
} = require('../controller/bannerController');

const router = express.Router();

// Public routes
router.get('/', getActiveBanners);

// Admin routes
router.get('/admin', authMiddleware, isStaff, getBannersAdmin);
router.post('/', authMiddleware, isStaff, createBanner);
router.put('/:id', authMiddleware, isStaff, updateBanner);
router.delete('/:id', authMiddleware, isStaff, deleteBanner);
router.put('/upload-image/:id', authMiddleware, isStaff, uploadPhoto.single('image'), uploadBannerImage);
router.delete('/delete-image/:id', authMiddleware, isStaff, deleteBannerImage);

module.exports = router;