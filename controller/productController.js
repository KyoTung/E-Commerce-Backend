const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const validateMongoDbId = require("../utils/validateMongoDB");
const cloudinaryUploadImage = require("../utils/cloudinary");
const path = require("path");
const fs = require("fs")

const createProduct = asyncHandler(async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const newProduct = await Product.create(req.body);
    res.json({
      message: "Product added successfully",
      product: newProduct,
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getAProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const product = await Product.findById(id);
    res.json(product);
  } catch (error) {
    throw new Error(error);
  }
});

const getAllProduct = asyncHandler(async (req, res) => {
  try {
    const queryObj = { ...req.query };

    // Loại bỏ các trường không dùng để lọc
    const excludedFields = ["sort", "page", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Chuyển đổi toán tử so sánh
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    const parsedQueryObj = JSON.parse(queryStr);

    // Tạo truy vấn
    let query = Product.find(parsedQueryObj);

    // Sắp xếp
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Chọn trường hiển thị
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const productCount = await Product.countDocuments();
      if (skip >= productCount) {
        throw new Error("This Page does not exists");
      }
    }

    // Thực thi truy vấn
    const products = await query;

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
    validateMongoDbId(id);
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const updateProduct = await Product.findOneAndUpdate(
      { _id: id },
      req.body,
      {
        new: true,
      }
    );

    res.json({
      message: "Product updated successfully",
      product: updateProduct,
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
    validateMongoDbId(id);
  try {
    const deleteProduct = await Product.findOneAndDelete({ _id: id });

    res.json({
      message: "Product deleted successfully",
      product: deleteProduct,
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const addToWishList = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { prdId } = req.body;
    validateMongoDbId(_id);
  try {
    const user = await User.findById(_id);
    const alreadyadded = user.wishlist.find((id) => id.toString() === prdId);
    if (alreadyadded) {
      let user = await User.findOneAndUpdate(
        _id,
        { $pull: { wishlist: prdId } },
        { new: true }
      );
      res.json(user);
    } else {
      let user = await User.findOneAndUpdate(
        _id,
        { $push: { wishlist: prdId } },
        { new: true }
      );
      res.json(user);
    }
  } catch (error) {
    throw new Error(error);
  }
});

const rating = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star,comment, prdId } = req.body;
  validateMongoDbId(_id);
  try {
    const product = await Product.findById(prdId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyRatedIndex = product.rating.findIndex(
      (r) => r.posteby.toString() === _id.toString()
    );

    if (alreadyRatedIndex !== -1) {
      product.rating[alreadyRatedIndex].star = star,
      product.rating[alreadyRatedIndex].comment = comment;
    } else {
      product.rating.push({ star, posteby: _id, comment });
    }

    await product.save();

    // Tính lại trung bình đánh giá
    const updatedProduct = await Product.findById(prdId);
    const totalRatingCount = updatedProduct.rating.length;
    const ratingSum = updatedProduct.rating.reduce((sum, item) => sum + item.star, 0);
    const averageRating = Math.round(ratingSum / totalRatingCount);

    updatedProduct.totalRating = averageRating;
    await updatedProduct.save();

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const uploadImagesProduct = asyncHandler(async(req, res)=>{
  const {id} = req.params;
    validateMongoDbId(id);
  try{
    const uploadImage = (path) => cloudinaryUploadImage(path, "images");
    const urls = [];
    const files = req.files;
    for(const file of files){
      const {path} = file;
      const newPath = await uploadImage(path);
      urls.push(newPath);
      fs.unlinkSync(path); 
    }
    const findProduct = await Product.findByIdAndUpdate(id, {
      images: urls.map((file) => {
        return file;
      })
    }, {
      new: true
    })
    res.json(findProduct);
  } catch(error){
    throw new Error(error);
  }
})

module.exports = {
  createProduct,
  getAProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishList,
  rating,
  uploadImagesProduct
};
