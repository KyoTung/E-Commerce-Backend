const multer = require("multer");
const sharp = require("sharp");
const path = require("path");


const multerStorage = multer.diskStorage({
    destination: function(req, res, cb) {
      cb(null, path.join(__dirname, "../public/images"))
    },
    filename: function(req, res, cb){
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + "-" + req.file.originalname)
    }
})

const multerFilter = (req, res, cb) =>{
   if(file.mimetype.startsWith("image/")){
       cb(null, true)
   }else{
       cb(new Error("Not an image! Please upload an image."), false)
   }
}


const uploadPhoto = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits:{fieldSize:2000000}
})

const productImgResize = async (req, res, next) => {
    if (!req.file) return next();
    req.file.filename = `product-${Date.now()}.jpeg`;
    await sharp(req.file.path)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/images/${req.file.filename}`);
    next();
}

module.exports = {uploadPhoto}