const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs")

// Cấu hình lưu file tạm thời
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// Lọc file chỉ cho phép ảnh
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image."), false);
  }
};

// Khởi tạo middleware upload
const uploadPhoto = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 2000000 }, // 2MB
});


const productImgResize = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  await Promise.all(
    req.files.map(async (file) => {
      const outputPath = path.join(__dirname, "../public/images/products", file.filename);
      await sharp(file.path)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(outputPath);

        //file.path = outputPath;

        fs.unlinkSync(outputPath)
        
    })
  );

  next();
};


const blogImgResize = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  await Promise.all(
    req.files.map(async (file) => {
      const outputPath = path.join(__dirname, "../public/images/blogs", file.filename);
      await sharp(file.path)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(outputPath);
         fs.unlinkSync(outputPath)
    })
  );

  next();
};


module.exports = { uploadPhoto, productImgResize, blogImgResize };
