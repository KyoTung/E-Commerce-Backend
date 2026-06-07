// models/InventoryTransaction.js
const mongoose = require('mongoose');

const InventoryTransactionModel = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['IMPORT', 'EXPORT', 'RETURN', 'ADJUSTMENT'],
    required: true,
    comment: 'IMPORT: Nhập từ nhà cung cấp; EXPORT: Xuất trả NCC, hủy hàng; RETURN: Khách trả hàng (từ đơn bán); ADJUSTMENT: Kiểm kho điều chỉnh'
  },
  receiptCode: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      const prefix = this.transactionType === 'IMPORT' ? 'NK' : (this.transactionType === 'EXPORT' ? 'XK' : (this.transactionType === 'RETURN' ? 'TH' : 'DK'));
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${prefix}${Date.now().toString().slice(-6)}${random}`;
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    // Chỉ bắt buộc nếu transactionType = IMPORT
    required: function() { return this.transactionType === 'IMPORT'; }
  },
  orderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    // Dùng cho RETURN hoặc EXPORT liên quan đến đơn hàng
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    color: {
      type: String,
      required: true
    },
    storage: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    importPrice: {
      type: Number,
      min: 0,
      // Chỉ lưu khi nhập (IMPORT) hoặc RETURN (nếu cần)
    },
    oldQuantity: {
      type: Number,
      required: true,
      comment: 'Số lượng tồn kho của biến thể trước khi giao dịch'
    },
    newQuantity: {
      type: Number,
      required: true,
      comment: 'Số lượng tồn kho sau khi giao dịch'
    }
  }],
  totalValue: {
    type: Number,
    default: 0,
    comment: 'Tổng giá trị phiếu (quantity * importPrice cho IMPORT, 0 cho các loại khác)'
  },
  note: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'cancelled'],
    default: 'completed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Tạo chỉ mục để tìm kiếm nhanh
InventoryTransactionModel.index({ receiptCode: 1 });
InventoryTransactionModel.index({ supplier: 1 });
InventoryTransactionModel.index({ createdAt: -1 });
InventoryTransactionModel.index({ 'items.product': 1 });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionModel);