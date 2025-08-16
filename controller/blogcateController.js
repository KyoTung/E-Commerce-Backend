const BlogCategory = require("../models/BlogCateModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createBlogcategory = asyncHandler(async (req, res) => {
  try {
    const bcategory = await BlogCategory.create(req.body);
    res.json({
      message: "BlogCategory created successfully",
      bcategory,
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
      const blogcate = await BlogCategory.findById(id);
      res.json(blogcate)
    } catch (error) {
    throw new Error(error);
  }
})

const deleteBlogCategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const blogcate = await BlogCategory.findByIdAndDelete(id);
      res.json({
        message: "Blogcategory deleted successfully",
        blogcate
      })
    } catch (error) {
    throw new Error(error);
  }
})

module.exports = {createBlogcategory, updateBlogcategory, getAllBlogCategory, getBlogCategory, deleteBlogCategory}

