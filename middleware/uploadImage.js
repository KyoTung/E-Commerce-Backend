const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {

    const dir = path.join(__dirname, "../public/images");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image."), false);
  }
};

const uploadPhoto = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 2000000 }, // 2MB
});


const productImgResize = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  await Promise.all(
    req.files.map(async (file) => {

      const uploadPath = path.join(__dirname, "../public/images/products/");

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const outputFileName = `resized-${file.filename}`;
      const outputPath = path.join(uploadPath, outputFileName);

      await sharp(file.path)
        .resize(300, 300) 
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      try {
          fs.unlinkSync(file.path); 
      } catch (e) { console.log("Lỗi xóa file gốc:", e) }


      file.path = outputPath;
      file.filename = outputFileName; 
      
    })
  );

  next();
};

const blogImgResize = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  await Promise.all(
    req.files.map(async (file) => {
      const uploadPath = path.join(__dirname, "../public/images/blogs/");
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const outputFileName = `resized-${file.filename}`;
      const outputPath = path.join(uploadPath, outputFileName);

      await sharp(file.path)
        .resize(300, 300)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      try {
          fs.unlinkSync(file.path);
      } catch (e) { console.log(e) }
      
      file.path = outputPath;
      file.filename = outputFileName;
    })
  );

  next();
};

module.exports = { uploadPhoto, productImgResize, blogImgResize };