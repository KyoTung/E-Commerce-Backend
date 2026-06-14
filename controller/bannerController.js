const Banner = require('../models/BannerModel');
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const { cloudinaryUploadImage, cloudinaryDeleteImage } = require('../utils/cloudinary');

// Helper upload ảnh lên Cloudinary
const uploadImageToCloud = async (filePath) => {
  return await cloudinaryUploadImage(filePath, 'banners');
};

// @desc    Tạo banner mới (chưa có ảnh)
// @route   POST /api/banner
// @access  Private (Admin)
const createBanner = asyncHandler(async (req, res) => {
  const { title, link, position, order, isActive, startDate, endDate } = req.body;
  const banner = await Banner.create({
    title,
    link: link || '',
    position: position || 'top',
    order: order || 0,
    isActive: isActive !== undefined ? isActive : true,
    startDate,
    endDate,
  });
  res.status(201).json(banner);
});

// @desc    Upload ảnh cho banner (cập nhật)
// @route   PUT /api/banner/upload-image/:id
// @access  Private (Admin)
const uploadBannerImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded' });
  }
  const filePath = req.file.path;
  try {
    const result = await uploadImageToCloud(filePath);
    const banner = await Banner.findByIdAndUpdate(
      id,
      {
        image: {
          url: result.url,
          asset_id: result.asset_id,
          public_id: result.public_id,
        },
      },
      { new: true }
    );
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    res.json(banner);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    // Xóa file tạm sau khi upload (dù thành công hay thất bại)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// @desc    Xóa ảnh của banner (giữ lại banner)
// @route   DELETE /api/banner/delete-image/:id
// @access  Private (Admin)
const deleteBannerImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' });
  }
  if (banner.image && banner.image.public_id) {
    await cloudinaryDeleteImage(banner.image.public_id, 'banners');
  }
  banner.image = { url: '', asset_id: '', public_id: '' };
  await banner.save();
  res.json({ message: 'Image deleted', banner });
});

// @desc    Cập nhật thông tin banner (không ảnh)
// @route   PUT /api/banner/:id
// @access  Private (Admin)
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, link, position, order, isActive, startDate, endDate } = req.body;
  const banner = await Banner.findByIdAndUpdate(
    id,
    { title, link, position, order, isActive, startDate, endDate },
    { new: true }
  );
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' });
  }
  res.json(banner);
});

// @desc    Xóa banner (cả ảnh)
// @route   DELETE /api/banner/:id
// @access  Private (Admin)
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);
  if (!banner) {
    return res.status(404).json({ message: 'Banner not found' });
  }
  if (banner.image && banner.image.public_id) {
    await cloudinaryDeleteImage(banner.image.public_id, 'banners');
  }
  await Banner.findByIdAndDelete(id);
  res.json({ message: 'Banner deleted successfully' });
});

// @desc    Lấy danh sách banner cho admin (có phân trang)
// @route   GET /api/banner/admin
// @access  Private (Admin)
const getBannersAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const banners = await Banner.find()
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  const total = await Banner.countDocuments();
  res.json({
    banners,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// @desc    Lấy danh sách banner active cho client (theo vị trí)
// @route   GET /api/banner
// @access  Public
const getActiveBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const banners = await Banner.find({
    isActive: true,
    $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
    $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
  }).sort({ order: 1 });
  res.json(banners);
});

module.exports = {
  createBanner,
  uploadBannerImage,
  deleteBannerImage,
  updateBanner,
  deleteBanner,
  getBannersAdmin,
  getActiveBanners,
};