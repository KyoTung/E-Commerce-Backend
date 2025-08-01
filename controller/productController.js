const Product = require("../models/ProductModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");

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

    if(req.query.page){
       const productCount = await Product.countDocuments();
       if(skip >= productCount){
        throw new Error ("This Page does not exists");
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

module.exports = {
  createProduct,
  getAProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
};
