const Brand = require("../models/BrandModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createBrand = asyncHandler(async (req, res) => {
  try {
    const cate = await Brand.create(req.body);
    res.json({
      message: "Brand created successfully",
      cate,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateBrand = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
       const updateBrand = await Brand.findByIdAndUpdate(id, req.body, {new: true});
       res.json(updateBrand)
    } catch (error) {
    throw new Error(error);
  }
}) 

const getAllBrand =  asyncHandler(async(req, res) =>{
    try{
        const allBrand = await Brand.find().sort({ createdAt: -1 });
        res.json(allBrand)
    } catch (error) {
    throw new Error(error);
  }
})

const getBrand = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const brand = await Brand.findById(id);
      res.json(brand)
    } catch (error) {
    throw new Error(error);
  }
})

const deleteBrand = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const brand = await Brand.findByIdAndDelete(id);
      res.json({
        message: "Brand deleted successfully",
        brand
      })
    } catch (error) {
    throw new Error(error);
  }
})

module.exports = {createBrand, updateBrand, getAllBrand, getBrand, deleteBrand}

