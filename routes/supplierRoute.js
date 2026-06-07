const express = require('express');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleWare');
const { createSupplier, getSuppliers, getSupplier, updateSupplier, deleteSupplier } = require('../controller/supplierController');

const router = express.Router();

router.post('/', authMiddleware, isAdmin, createSupplier);
router.get('/', authMiddleware, isAdmin, getSuppliers);
router.get('/:id', authMiddleware, isAdmin, getSupplier);
router.put('/:id', authMiddleware, isAdmin, updateSupplier);
router.delete('/:id', authMiddleware, isAdmin, deleteSupplier);

module.exports = router;