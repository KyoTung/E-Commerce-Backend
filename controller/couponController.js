const Coupon = require("../models/CouponModel")
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");


const createCoupon = asyncHandler(async(req, res) =>{
    try{
       const newCoupon = await Coupon.create(req.body);
       res.status(201).json(newCoupon);
    } catch(error){
        throw new Error(error);
    }
});

const getAllCoupon = asyncHandler(async(req, res) =>{
    try{
        const allCoupon = await Coupon.find().sort({ createdAt: -1 });
        res.json(allCoupon);
    } catch(error){
        throw new Error(error);
    }
});

const getCoupon = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
        const coupon = await Coupon.findById(id);
        res.json(coupon);
    } catch(error){
        throw new Error(error);
    }
});

const updateCoupon = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
        const updatedCoupon = await Coupon.findByIdAndUpdate(id, req.body, {new: true});
        res.json(updatedCoupon);
    } catch(error){
        throw new Error(error);
    }
});

const deleteCoupon = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
        await Coupon.findByIdAndDelete(id);
        res.json({message: "Coupon deleted successfully"});
    } catch(error){
        throw new Error(error);
    }
});


module.exports = {createCoupon, getAllCoupon, getCoupon, updateCoupon, deleteCoupon}