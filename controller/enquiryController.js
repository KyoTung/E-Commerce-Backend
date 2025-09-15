const Enquiry = require("../models/EnquiryModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongoDB");

const createEnquiry = asyncHandler(async (req, res) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    res.json({
      message: "Enquiry created successfully",
      enquiry,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateEnquiry = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
       const updateEnquiry = await Enquiry.findByIdAndUpdate(id, req.body, {new: true});
       res.json(updateEnquiry)
    } catch (error) {
    throw new Error(error);
  }
}) 

const getAllEnquiry =  asyncHandler(async(req, res) =>{
    try{
        const allEnquiry = await Enquiry.find();
        res.json(allEnquiry)
    } catch (error) {
    throw new Error(error);
  }
})

const getEnquiry = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const enquiry = await Enquiry.findById(id);
      res.json(enquiry)
    } catch (error) {
    throw new Error(error);
  }
})

const deleteEnquiry = asyncHandler(async(req, res) =>{
    const {id} = req.params;
    validateMongoDbId(id);
    try{
      const enquiry = await Enquiry.findByIdAndDelete(id);
      res.json({
        message: "Enquiry deleted successfully",
        enquiry
      })
    } catch (error) {
    throw new Error(error);
  }
})

module.exports = {createEnquiry, updateEnquiry, getAllEnquiry, getEnquiry, deleteEnquiry}

