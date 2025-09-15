const Category = require("../models/CategoryModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createCategory = asyncHandler(async (req, res) => {
  try {
    const cate = await Category.create(req.body);
    res.json({
      message: "Category created successfully",
      cate,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateCategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
       const updateCate = await Category.findByIdAndUpdate(id, req.body, {new: true});
       res.json(updateCate)
    } catch (error) {
    throw new Error(error);
  }
}) 

const getAllCategory =  asyncHandler(async(req, res) =>{
    try{
        const allCate = await Category.find();
        res.json(allCate)
    } catch (error) {
    throw new Error(error);
  }
})

const getCategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const cate = await Category.findById(id);
      res.json(cate)
    } catch (error) {
    throw new Error(error);
  }
})

const deleteCategory = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const cate = await Category.findByIdAndDelete(id);
      res.json({
        message: "Category deleted successfully",
        cate
      })
    } catch (error) {
    throw new Error(error);
  }
})

module.exports = {createCategory, updateCategory, getAllCategory, getCategory, deleteCategory}

