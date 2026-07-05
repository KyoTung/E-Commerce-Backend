const Blog = require("../models/BlogModel");
const User = require("../models/UserModel");
const BlogCategory = require("../models/BlogCateModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");
const {cloudinaryUploadImage,cloudinaryDeleteImage} = require("../utils/cloudinary");
const fs = require("fs");

const createBlog = asyncHandler(async (req, res) => {
  try {
    const newBlog = await Blog.create(req.body);
    res.json({
      message: "Blog created successfully",
      newBlog,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const updateBlog = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json({
      message: "Blog updated successfully",
      updateBlog,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// const getAllBlogs = asyncHandler(async (req, res) => {
//   try {
//     const { category, limit = 10, page = 1, search } = req.query;

//     let filter = {};

//     // Lọc theo danh mục (category là string title)
//     if (category) {
//       let foundCategory = null;
//       // Nếu category là ObjectId
//       if (category.match(/^[0-9a-fA-F]{24}$/)) {
//         foundCategory = await BlogCategory.findById(category);
//       }
//       if (!foundCategory) {
//         foundCategory = await BlogCategory.findOne({ slug: category });
//       }
//       if (!foundCategory) {
//         foundCategory = await BlogCategory.findOne({ title: category });
//       }
//       if (foundCategory) {
//         // SỬA: gán bằng title của category (vì Blog.category là string)
//         filter.category = foundCategory.title;
//       } else {
//         // Không tìm thấy category -> trả về mảng rỗng
//         return res.json({
//           blogs: [],
//           total: 0,
//           page: 1,
//           limit: 10,
//           totalPages: 0,
//         });
//       }
//     }

//     // Tìm kiếm theo tiêu đề (nếu có)
//     if (search) {
//       filter.title = { $regex: search, $options: "i" };
//     }

//     const limitNum = parseInt(limit);
//     const pageNum = parseInt(page);
//     const skip = (pageNum - 1) * limitNum;

//     const total = await Blog.countDocuments(filter);

//     // Lấy danh sách bài viết (bỏ populate vì category không phải ObjectId)
//     const blogs = await Blog.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .exec();

//     res.json({
//       blogs,
//       total,
//       page: pageNum,
//       limit: limitNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const getAllBlogs = asyncHandler(async (req, res) => {
  try {
    const { category, limit = 10, page = 1, search } = req.query;

    let filter = {};

    // 1. Lọc theo danh mục
    if (category) {
      let foundCategory = null;
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        foundCategory = await BlogCategory.findById(category);
      }
      if (!foundCategory) foundCategory = await BlogCategory.findOne({ slug: category });
      if (!foundCategory) foundCategory = await BlogCategory.findOne({ title: category });
      
      if (foundCategory) {
        filter.category = foundCategory.title; 
      } else {
        return res.json({ blogs: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      }
    }

    // 2. TỐI ƯU LOGIC TÌM KIẾM (Tìm trên cả Tiêu đề và Mô tả)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // 3. Phân trang & Query CSDL
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const total = await Blog.countDocuments(filter);
    const blogs = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .exec();

    res.json({
      blogs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const blog = await Blog.findById(id).populate("likes").populate("dislikes");
    const updateView = await Blog.findByIdAndUpdate(
      id,
      {
        $inc: { numViews: 1 }, //lay 1 blog va cap nhat luot xem +1
      },
      {
        new: true,
      }
    );
    res.json(blog);
  } catch (error) {
    throw new Error(error);
  }
});

const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const blog = await Blog.findByIdAndDelete(id);
    res.json({
      message: "Blog deleted successfully",
      success: true,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const likeBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.body;
  validateMongoDbId(blogId);

  //tim blog muon like
  const blog = await Blog.findById(blogId);
  //lay id user da dang nhap
  const userLoginId = req?.user?._id;
  //kiem tra user  da like hay chua
  const isLike = blog?.isLiked;
  //kiem tra user co dislike blog hay khong
  const alreadyLike = blog?.dislikes.find(
    (userId) => userId?.toString() === userLoginId?.toString()
  );
  if (alreadyLike) {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $pull: { dislikes: userLoginId },
        isDisliked: false,
      },
      { new: true }
    );
    res.json(blog);
  }
  if (isLike) {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $pull: { likes: userLoginId },
        isLiked: false,
      },
      { new: true }
    );
    res.json(blog);
  } else {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $push: { likes: userLoginId },
        isLiked: true,
      },
      { new: true }
    );
    res.json(blog);
  }
});

const dislikeBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.body;
  validateMongoDbId(blogId);

  //tim blog muon dislike
  const blog = await Blog.findById(blogId);

  //lay id user da dang nhap
  const userLoginId = req?.user?._id;

  //kiem tra user co dislike hay khong
  const isDisliked = blog?.isDisliked;

  //kiem tra user co like blog hay khong
  const alreadyLiked = blog?.likes.find(
    (userId) => userId?.toString() === userLoginId?.toString()
  );
  if (alreadyLiked) {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $pull: { likes: userLoginId },
        isLiked: false,
      },
      { new: true }
    );
    res.json(blog);
  }
  if (isDisliked) {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $pull: { dislikes: userLoginId },
        isDisliked: false,
      },
      { new: true }
    );
    res.json(blog);
  } else {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      {
        $push: { dislikes: userLoginId },
        isDisliked: true,
      },
      { new: true }
    );
    res.json(blog);
  }
});

const uploadImages = asyncHandler(async (req, res) => {
  try {
    const uploadImage = (path) => cloudinaryUploadImage(path, "images");
    const urls = [];
    const files = req.files;
    for (const file of files) {
      const { path } = file;
      const newPath = await uploadImage(path);
      urls.push(newPath);
      fs.unlinkSync(path);
    }
    const images = urls.map((file) => {
      return file;
    });
    res.json(images);
  } catch (error) {
    throw new Error(error);
  }
});

const deleteImages = asyncHandler(async (req, res) => {
  const {id, publicIdToDelete} = req.params;
  try {
     cloudinaryDeleteImage(publicIdToDelete, "images");
   const deleteImage = await Blog.updateOne(
  { _id: id },
  { $pull: { images: { public_id: publicIdToDelete } } }
);
   res.json({
    message:"Images deleted",
    deleteImage
   })
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createBlog,
  updateBlog,
  getAllBlogs,
  getBlog,
  deleteBlog,
  likeBlog,
  dislikeBlog,
  uploadImages,
  deleteImages
};
