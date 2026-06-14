const express = require('express');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleWare');
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
router.get('/admin', authMiddleware, isAdmin, getBannersAdmin);
router.post('/', authMiddleware, isAdmin, createBanner);
router.put('/:id', authMiddleware, isAdmin, updateBanner);
router.delete('/:id', authMiddleware, isAdmin, deleteBanner);
router.put('/upload-image/:id', authMiddleware, isAdmin, uploadPhoto.single('image'), uploadBannerImage);
router.delete('/delete-image/:id', authMiddleware, isAdmin, deleteBannerImage);

module.exports = router;