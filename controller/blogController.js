const Blog = require("../models/BlogModel");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createBlog = asyncHandler(async (req, res) => {
  try {
    const newBlog = await Blog.create(req.body);
    res.json({
        message:"Blog created successfully",
        status: true,
        newBlog
    })
  } catch(error){
    throw new Error(error);
  }
});

module.exports = { createBlog };
