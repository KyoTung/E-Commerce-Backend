const Color = require("../models/ColorModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createColor = asyncHandler(async (req, res) => {
  try {
    const color = await Color.create(req.body);
    res.json({
      message: "Color created successfully",
      color,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateColor = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
       const updateColor = await Color.findByIdAndUpdate(id, req.body, {new: true});
       res.json(updateColor)
    } catch (error) {
    throw new Error(error);
  }
}) 

const getAllColor =  asyncHandler(async(req, res) =>{
    try{
        const allColor = await Color.find();
        res.json(allColor)
    } catch (error) {
    throw new Error(error);
  }
})

const getColor = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const color = await Color.findById(id);
      res.json(color)
    } catch (error) {
    throw new Error(error);
  }
})

const deleteColor = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const color = await Color.findByIdAndDelete(id);
      res.json({
        message: "Color deleted successfully",
        color
      })
    } catch (error) {
    throw new Error(error);
  }
})

module.exports = {createColor, updateColor, getAllColor, getColor, deleteColor}

