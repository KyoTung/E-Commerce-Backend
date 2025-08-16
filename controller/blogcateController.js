const BlogCategory = require("../models/BlogCateModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createBlogcategory = asyncHandler(async (req, res) => {
  try {
    const blogCategory = await BlogCategory.create(req.body);
    res.json({
      message: "BlogCategory created successfully",
      blogCategory,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateBlogcategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
       const updateBlogCate = await BlogCategory.findByIdAndUpdate(id, req.body, {new: true});
       res.json(updateBlogCate)
    } catch (error) {
    throw new Error(error);
  }
}) 

const getAllBlogCategory =  asyncHandler(async(req, res) =>{
    try{
        const allBlogCate = await BlogCategory.find();
        res.json(allBlogCate)
    } catch (error) {
    throw new Error(error);
  }
})

const getBlogCategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const blogCate = await BlogCategory.findById(id);
      res.json(blogCate)
    } catch (error) {
    throw new Error(error);
  }
})

const deleteBlogCategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const blogCate = await BlogCategory.findByIdAndDelete(id);
      res.json({
        message: "Blogcategory deleted successfully",
        blogCate
      })
    } catch (error) {
    throw new Error(error);
  }
})

module.exports = {createBlogcategory, updateBlogcategory, getAllBlogCategory, getBlogCategory, deleteBlogCategory}

