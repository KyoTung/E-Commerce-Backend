
const Supplier = require('../models/SupplierModel');
const asyncHandler = require('express-async-handler');
const validateMongoDbId = require('../utils/validateMongoDB');

const createSupplier = asyncHandler(async (req, res) => {
  const { name, email, phone, address, taxCode, contactPerson, note, status } = req.body;
  const supplier = await Supplier.create({
    name,
    email,
    phone,
    address,
    taxCode,
    contactPerson,
    note,
    status,
    createdBy: req.user._id
  });
  res.status(201).json(supplier);
});

const getSuppliers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  let filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  const skip = (page - 1) * limit;
  const suppliers = await Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Supplier.countDocuments(filter);
  res.json({
    suppliers,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit)
  });
});

const getSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }
  res.json(supplier);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }
  res.json(supplier);
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }
  res.json({ message: 'Supplier deleted successfully' });
});

module.exports = { createSupplier, getSuppliers, getSupplier, updateSupplier, deleteSupplier };