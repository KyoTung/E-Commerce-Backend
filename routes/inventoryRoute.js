const express = require('express');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleWare');
const {
  createImportTransaction,
  createExportTransaction,
  getTransactions,
  getTransactionDetail,
  cancelImportTransaction,
  getCurrentStock
} = require('../controller/inventoryController');

const router = express.Router();

router.post('/import', authMiddleware, isAdmin, createImportTransaction);
router.post('/export', authMiddleware, isAdmin, createExportTransaction);
router.get('/transactions', authMiddleware, isAdmin, getTransactions);
router.get('/transactions/:id', authMiddleware, isAdmin, getTransactionDetail);
router.put('/transactions/:id/cancel', authMiddleware, isAdmin, cancelImportTransaction);
router.get('/stock', authMiddleware, isAdmin, getCurrentStock);

module.exports = router;