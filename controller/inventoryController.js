// controller/inventoryController.js
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const validateMongoDbId = require('../utils/validateMongoDB');

// Helper: lấy tồn kho hiện tại của một biến thể
const getCurrentQuantity = async (productId, color, storage) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');
  const variant = product.variants.find(v => v.color === color && v.storage === storage);
  return variant ? variant.quantity : 0;
};

// Tạo phiếu nhập kho (IMPORT)
const createImportTransaction = asyncHandler(async (req, res) => {
  const { supplier, items, note } = req.body;
  if (!supplier || !items || items.length === 0) {
    return res.status(400).json({ error: 'Thiếu thông tin nhà cung cấp hoặc danh sách sản phẩm' });
  }
  validateMongoDbId(supplier);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let totalValue = 0;
    const processedItems = [];
    // Duyệt từng item để lấy oldQuantity và tính toán
    for (let item of items) {
      const { product, color, storage, quantity, importPrice } = item;
      validateMongoDbId(product);
      // Lấy số lượng tồn hiện tại
      const oldQuantity = await getCurrentQuantity(product, color, storage);
      const newQuantity = oldQuantity + quantity;
      processedItems.push({
        product,
        color,
        storage,
        quantity,
        importPrice: importPrice || 0,
        oldQuantity,
        newQuantity
      });
      totalValue += (importPrice || 0) * quantity;
    }
    // Tạo phiếu nhập
    const transaction = await InventoryTransaction.create([{
      transactionType: 'IMPORT',
      supplier,
      items: processedItems,
      totalValue,
      note,
      createdBy: req.user._id,
      status: 'completed'
    }], { session });
    // Cập nhật tồn kho cho từng biến thể (dùng bulkWrite)
    const bulkOps = processedItems.map(item => ({
      updateOne: {
        filter: {
          _id: item.product,
          'variants.color': item.color,
          'variants.storage': item.storage
        },
        update: {
          $inc: { 'variants.$.quantity': item.quantity }
        }
      }
    }));
    await Product.bulkWrite(bulkOps, { session });
    await session.commitTransaction();
    res.status(201).json({ success: true, transaction: transaction[0] });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Tạo phiếu xuất kho (EXPORT) - dùng cho trả NCC, hủy hàng, điều chỉnh giảm
const createExportTransaction = asyncHandler(async (req, res) => {
  const { supplier, items, note, exportType } = req.body; // exportType có thể là 'return_to_supplier', 'damage', 'internal_use'
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Danh sách sản phẩm không được trống' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const processedItems = [];
    for (let item of items) {
      const { product, color, storage, quantity } = item;
      validateMongoDbId(product);
      const oldQuantity = await getCurrentQuantity(product, color, storage);
      if (oldQuantity < quantity) {
        throw new Error(`Sản phẩm ${product} không đủ hàng để xuất. Tồn: ${oldQuantity}, yêu cầu: ${quantity}`);
      }
      const newQuantity = oldQuantity - quantity;
      processedItems.push({
        product,
        color,
        storage,
        quantity,
        oldQuantity,
        newQuantity
      });
    }
    const transaction = await InventoryTransaction.create([{
      transactionType: 'EXPORT',
      supplier: supplier || null,
      items: processedItems,
      note,
      createdBy: req.user._id,
      status: 'completed'
    }], { session });
    // Cập nhật giảm tồn kho
    const bulkOps = processedItems.map(item => ({
      updateOne: {
        filter: {
          _id: item.product,
          'variants.color': item.color,
          'variants.storage': item.storage
        },
        update: {
          $inc: { 'variants.$.quantity': -item.quantity }
        }
      }
    }));
    await Product.bulkWrite(bulkOps, { session });
    await session.commitTransaction();
    res.status(201).json({ success: true, transaction: transaction[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Lấy danh sách giao dịch (có filter và phân trang)
const getTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { type, supplier, startDate, endDate } = req.query;
  let filter = {};
  if (type) filter.transactionType = type;
  if (supplier) filter.supplier = supplier;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  const skip = (page - 1) * limit;
  const transactions = await InventoryTransaction.find(filter)
    .populate('supplier', 'name phone')
    .populate('createdBy', 'firstname lastname email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await InventoryTransaction.countDocuments(filter);
  res.json({
    transactions,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit)
  });
});

// Lấy chi tiết một giao dịch
const getTransactionDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  const transaction = await InventoryTransaction.findById(id)
    .populate('supplier', 'name phone email')
    .populate('createdBy', 'firstname lastname')
    .populate('items.product', 'title images');
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  res.json(transaction);
});

// Hủy phiếu nhập (nếu đã nhập sai) - chỉ cho phép hủy nếu chưa bị ảnh hưởng bởi các giao dịch khác? Ở đây ta sẽ hoàn lại kho
const cancelImportTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  const transaction = await InventoryTransaction.findById(id);
  if (!transaction || transaction.transactionType !== 'IMPORT') {
    return res.status(400).json({ error: 'Chỉ có thể hủy phiếu nhập kho' });
  }
  if (transaction.status !== 'completed') {
    return res.status(400).json({ error: 'Phiếu đã bị hủy trước đó' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Hoàn lại số lượng
    const bulkOps = transaction.items.map(item => ({
      updateOne: {
        filter: {
          _id: item.product,
          'variants.color': item.color,
          'variants.storage': item.storage
        },
        update: {
          $inc: { 'variants.$.quantity': -item.quantity } // Trừ đi số đã nhập
        }
      }
    }));
    await Product.bulkWrite(bulkOps, { session });
    transaction.status = 'cancelled';
    await transaction.save({ session });
    await session.commitTransaction();
    res.json({ success: true, message: 'Đã hủy phiếu nhập và hoàn trả kho' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Lấy tồn kho hiện tại của tất cả biến thể (hỗ trợ lọc)
const getCurrentStock = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let filter = {};
  if (search) {
    // Tìm kiếm theo tên sản phẩm
    const products = await Product.find({ title: { $regex: search, $options: 'i' } }).select('_id');
    const productIds = products.map(p => p._id);
    filter._id = { $in: productIds };
  }
  const products = await Product.find(filter).select('title images variants');
  const stockData = [];
  for (let prod of products) {
    for (let variant of prod.variants) {
      stockData.push({
        productId: prod._id,
        productTitle: prod.title,
        image: prod.images?.[0]?.url || '',
        color: variant.color,
        storage: variant.storage,
        quantity: variant.quantity,
        sold: variant.sold || 0,
        price: variant.price
      });
    }
  }
  res.json(stockData);
});

module.exports = {
  createImportTransaction,
  createExportTransaction,
  getTransactions,
  getTransactionDetail,
  cancelImportTransaction,
  getCurrentStock
};