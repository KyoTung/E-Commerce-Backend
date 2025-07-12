const Product = require("../models/ProductModel")
const asyncHandler = require("express-async-handler");
const slugify = require("slugify")


const createProduct = asyncHandler(async(req, res)=>{
    try{
        if(req.body.title){
            req.body.slug = slugify(req.body.title);
        }
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

const getAProduct = asyncHandler(async(req, res)=>{
   const {id} = req.params;
   try{
    const product = await Product.findById(id)
    res.json(product)
   } catch (error){
      throw new Error(error);
   }
})

const getAllProduct = asyncHandler(async(req, res)=>{
    try{
         const allProduct = await Product.find();
         res.json(allProduct)
    } catch{
        throw new Error(error);
    }
})

const updateProduct = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    try{
        if (req.body.title) {
          req.body.slug = slugify(req.body.title);
        }
       const updateProduct = await Product.findOneAndUpdate({_id:id}, req.body, {
         new: true,
       });
       
       res.json({
        message:"Product updated successfully",
        product: updateProduct,
        success:true
       })
    
    } catch (error){
        throw new Error(error);
    }
})

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deleteProduct = await Product.findOneAndDelete({_id:id})

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