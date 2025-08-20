const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Tên folder trên Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const cloudinaryUploadImage = async(fileUpload) =>{
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(fileUpload, (error, result) => {
            resolve({
                url:result.secure_url
            }, {
                resource_type:"auto"
            });
        });
    });
}

module.exports = cloudinaryUploadImage;
