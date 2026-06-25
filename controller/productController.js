const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const validateMongoDbId = require("../utils/validateMongoDB");
const {
  cloudinaryUploadImage,
  cloudinaryDeleteImage,
} = require("../utils/cloudinary");
const path = require("path");
const fs = require("fs");

const createProduct = asyncHandler(async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    if (req.body.category) {
      req.body.slugCategory = slugify(req.body.category);
    }
    if (req.body.brand) {
      req.body.slugBrand = slugify(req.body.brand);
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

    if (parsedQueryObj["basePrice[$gte]"]) {
      parsedQueryObj.basePrice = {
        ...parsedQueryObj.basePrice,
        $gte: Number(parsedQueryObj["basePrice[$gte]"]), // Ép kiểu về số
      };
      delete parsedQueryObj["basePrice[$gte]"]; // Xóa key sai
    }

    if (parsedQueryObj["basePrice[$lte]"]) {
      parsedQueryObj.basePrice = {
        ...parsedQueryObj.basePrice,
        $lte: Number(parsedQueryObj["basePrice[$lte]"]), // Ép kiểu về số
      };
      delete parsedQueryObj["basePrice[$lte]"]; // Xóa key sai
    }

    if (req.query.title) {
      parsedQueryObj.title = {
        $regex: req.query.title,
        $options: "i", // "i" = case-insensitive (không phân biệt hoa thường)
      };
    }

    console.log("Final Query:", JSON.stringify(parsedQueryObj, null, 2));

    // Tạo truy vấn
    let query = Product.find(parsedQueryObj);

    // Sắp xếp
    if (req.query.sort) {
      // Thêm "_id" vào cuối chuỗi sort để đảm bảo thứ tự duy nhất
      let sortBy = req.query.sort;
      if (!sortBy.includes("_id")) {
        sortBy = sortBy.split(",").concat("_id").join(" ");
      } else {
        sortBy = sortBy.split(",").join(" ");
      }
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt _id");
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


const getAllProductsAdmin = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || ""; 
    const sort = req.query.sort || "";     

    const skip = (page - 1) * limit;

    // Stage 1: Xây dựng bộ lọc tìm kiếm ($match)
    let matchStage = {};
    if (search) {
      matchStage.title = { $regex: search, $options: "i" };
    }

    // Lọc theo trạng thái đóng/mở kinh doanh
    if (status === "active") {
      matchStage.isActive = true;   
    } else if (status === "inactive") {
      matchStage.isActive = false;  
    }

    // Stage 2: Tính tổng kho và tổng đã bán của toàn bộ các biến thể thuộc sản phẩm ($addFields)
    let addFieldsStage = {
      // Tính tổng trường quantity của tất cả phần tử trong mảng variants
      totalQuantity: { $sum: "$variants.quantity" },
      // Tính tổng trường sold của tất cả phần tử trong mảng variants
      totalSold: { $sum: "$variants.sold" }
    };

    // Stage 3: Xác định tiêu chí sắp xếp ($sort)
    let sortStage = {};
    if (sort === "price_asc") {
      sortStage.basePrice = 1;        // Giá cơ bản từ thấp đến cao
    } else if (sort === "price_desc") {
      sortStage.basePrice = -1;       // Giá cơ bản từ cao đến thấp
    } else if (sort === "sold_desc") {
      sortStage.totalSold = -1;       // Sắp xếp theo tổng hàng ĐÃ BÁN giảm dần (Bán chạy nhất)
    } else if (sort === "quantity_asc") {
      sortStage.totalQuantity = 1;    // Sắp xếp theo tổng hàng TỒN KHO tăng dần (Sắp hết hàng)
    } else if (sort === "quantity_desc") {
      sortStage.totalQuantity = -1;   // Sắp xếp theo tổng hàng TỒN KHO giảm dần
    } else {
      sortStage.createdAt = -1;       // Mặc định: Sản phẩm mới tạo lên đầu
    }

    // Stage 4: Sử dụng $facet để gom đếm tổng số bản ghi và phân trang dữ liệu trong một câu lệnh duy nhất
    const aggregationPipeline = [
      { $match: matchStage },
      { $addFields: addFieldsStage },
      { $sort: sortStage },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }, { $project: { __v: 0 } }]
        }
      }
    ];

    // Thực thi câu lệnh Aggregation
    const result = await Product.aggregate(aggregationPipeline);

    // Bóc tách dữ liệu trả về từ $facet
    const products = result[0].data || [];
    const total = result[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Trả về dữ liệu chuẩn cấu trúc ban đầu cho Frontend
    res.json({
      products,
      total,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// const updateProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);

//   try {
//     const { isActive, ...updateData } = req.body;

//     if (updateData.title) {
//       updateData.slug = slugify(updateData.title);
//     }

//     const updatedProduct = await Product.findOneAndUpdate(
//       { _id: id },
//       updateData,
//       {
//         new: true,
//       }
//     );

//     res.json({
//       message: "Product updated successfully",
//       product: updatedProduct,
//       success: true,
//     });
//   } catch (error) {
//     throw new Error(error);
//   }
// });




// const deleteProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);
//   try {
//     const deleteProduct = await Product.findOneAndDelete({ _id: id });

//     res.json({
//       message: "Product deleted successfully",
//       product: deleteProduct,
//       success: true,
//     });
//   } catch (error) {
//     throw new Error(error);
//   }
// });

// Thay thế hàm deleteProduct cũ trong file productController.js

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  const { isActive, ...updateData } = req.body;

  console.log("🟡 Dữ liệu nhận được từ frontend:", req.body); // Debug

  try {
    if (updateData.title) {
      updateData.slug = slugify(updateData.title);
    }

    if (updateData.category) {
      updateData.slugCategory = slugify(updateData.category);
    }

    if (updateData.brand) {
      updateData.slugBrand = slugify(updateData.brand);
    }

    // Xử lý variants: đảm bảo price và quantity là số
    if (updateData.variants && Array.isArray(updateData.variants)) {
      updateData.variants = updateData.variants.map((v) => ({
        ...v,
        price: Number(v.price) || 0,
        quantity: Number(v.quantity) || 0,
        // Đảm bảo images là mảng (nếu không có thì để mảng rỗng)
        images: v.images || [],
      }));
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("✅ Sản phẩm đã cập nhật:", updatedProduct); // Debug

    res.json({
      message: "Cập nhật sản phẩm thành công",
      product: updatedProduct,
      success: true,
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật sản phẩm:", error);
    res.status(500).json({ message: error.message });
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    // 1. Tìm sản phẩm hiện tại trong cơ sở dữ liệu
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // 2. Đảo ngược trạng thái hoạt động (Nếu đang bật -> Tắt / Khóa, nếu đang khóa -> Bật lại)
    product.isActive = !product.isActive;
    await product.save();

    res.json({
      message: product.isActive ? "Đã mở khóa sản phẩm thành công" : "Đã khóa/ẩn sản phẩm thành công",
      product,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      let updatedUser = await User.findByIdAndUpdate(
        _id,
        {
          $pull: { wishlist: prdId },
        },
        {
          new: true,
        },
      );
      res.json(updatedUser);
    } else {
      let updatedUser = await User.findByIdAndUpdate(
        _id,
        {
          $push: { wishlist: prdId },
        },
        {
          new: true,
        },
      );
      res.json(updatedUser);
    }
  } catch (error) {
    throw new Error(error);
  }
});
const rating = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star, comment, prdId } = req.body;
  validateMongoDbId(_id);
  try {
    const product = await Product.findById(prdId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyRatedIndex = product.rating.findIndex(
      (r) => r.posteby.toString() === _id.toString(),
    );

    if (alreadyRatedIndex !== -1) {
      ((product.rating[alreadyRatedIndex].star = star),
        (product.rating[alreadyRatedIndex].comment = comment));
    } else {
      product.rating.push({ star, posteby: _id, comment });
    }

    await product.save();

    // Tính lại trung bình đánh giá
    const updatedProduct = await Product.findById(prdId);
    const totalRatingCount = updatedProduct.rating.length;
    const ratingSum = updatedProduct.rating.reduce(
      (sum, item) => sum + item.star,
      0,
    );
    const averageRating = Math.round(ratingSum / totalRatingCount);

    updatedProduct.totalRating = averageRating;
    await updatedProduct.save();

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const uploadImagesProduct = asyncHandler(async (req, res) => {
  try {
    const uploadImage = (path) => cloudinaryUploadImage(path, "images");
    const files = req.files;

    const images = await Promise.all(
      files.map(async (file) => {
        const { path } = file;
        try {
          const newPath = await uploadImage(path);
          return newPath;
        } catch (error) {
          console.error("Lỗi upload ảnh:", error);
          throw error;
        } finally {
          try {
            if (fs.existsSync(path)) fs.unlinkSync(path);
          } catch (e) {
            console.log("Lỗi xóa file tạm:", e);
          }
        }
      }),
    );

    res.json(images);
  } catch (error) {
    throw new Error(error);
  }
});

// const deleteImagesProduct = asyncHandler(async (req, res) => {
//   const { id, publicIdToDelete } = req.params;
//   try {
//     cloudinaryDeleteImage(publicIdToDelete, "images");
//     const deleteImage = await Product.updateOne(
//       { _id: id },
//       { $pull: { images: { public_id: publicIdToDelete } } },
//     );
//     res.json({
//       message: "Images deleted",
//       deleteImage,
//     });
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const deleteImagesProduct = asyncHandler(async (req, res) => {
  const { id } = req.params; 
  const { publicIdToDelete } = req.body; 

  if (!publicIdToDelete) {
    return res.status(400).json({ message: "Thiếu publicIdToDelete" });
  }

  try {
    // 1. Xóa ảnh trên Cloudinary
    await cloudinaryDeleteImage(publicIdToDelete, "images");

    // 2. Xóa ảnh trong mảng images tổng của sản phẩm
    await Product.updateOne(
      { _id: id },
      { $pull: { images: { public_id: publicIdToDelete } } }
    );

    // 3. Xóa ảnh nằm sâu bên trong mảng images của từng biến thể (variants)
    await Product.updateOne(
      { _id: id },
      { $pull: { "variants.$[].images": { public_id: publicIdToDelete } } }
    );

    res.json({
      message: "Xóa ảnh thành công",
      success: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = {
  createProduct,
  getAProduct,
  getAllProduct,
  getAllProductsAdmin,
  updateProduct,
  deleteProduct,
  addToWishList,
  rating,
  uploadImagesProduct,
  deleteImagesProduct,
};
