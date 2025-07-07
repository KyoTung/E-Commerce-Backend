const Product = require("../models/ProductModel")
const asyncHandler = require("express-async-handler");



const createProduct = asyncHandler(async(req, res)=>{
    try{
       const newProduct = await Product.create(req.body);
       res.json({
         message: "Product added successfully",
         product:newProduct,
         success: true,
       });
    }
    catch (error){
       throw new Error(error)
    }
})




module.exports = { createProduct };