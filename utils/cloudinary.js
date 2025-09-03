const cloudinary = require('cloudinary').v2;
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUploadImage = async(fileUpload) =>{
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(fileUpload, (error, result) => {
            resolve({
                url:result.secure_url,
                asset_id:result.asset_id,
                public_id:result.public_id
            }, {
                resource_type:"auto"
            });
        });
    });
}

const cloudinaryDeleteImage = async(fileDelete) =>{
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(fileDelete, (error, result) => {
            resolve({
                url:result.secure_url,
                asset_id:result.asset_id,
                public_id:result.public_id
            }, {
                resource_type:"auto"
            });
        });
    });
}




module.exports = {cloudinaryUploadImage,cloudinaryDeleteImage}
