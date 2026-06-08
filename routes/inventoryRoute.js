const express = require('express');
const { authMiddleware, isAdmin, isStaff } = require('../middleware/authMiddleWare');
const {
  createImportTransaction,
  createExportTransaction,
  getTransactions,
  getTransactionDetail,
  cancelImportTransaction,
  getCurrentStock
} = require('../controller/inventoryController');

const router = express.Router();

router.post('/import', authMiddleware, isStaff, createImportTransaction);
router.post('/export', authMiddleware, isStaff, createExportTransaction);
router.get('/transactions', authMiddleware, isStaff, getTransactions);
router.get('/transactions/:id', authMiddleware, isStaff, getTransactionDetail);
router.put('/transactions/:id/cancel', authMiddleware, isStaff, cancelImportTransaction);
router.get('/stock', authMiddleware, isStaff, getCurrentStock);

module.exports = router;