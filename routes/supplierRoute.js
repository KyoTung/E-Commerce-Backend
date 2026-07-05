const express = require('express');
const { authMiddleware, isAdmin, isStaff } = require('../middleware/authMiddleWare');
const { createSupplier, getSuppliers, getSupplier, updateSupplier, deleteSupplier } = require('../controller/supplierController');

const router = express.Router();

router.post('/', authMiddleware, isStaff, createSupplier);
router.get('/', authMiddleware, isStaff, getSuppliers);
router.get('/:id', authMiddleware, isStaff, getSupplier);
router.put('/:id', authMiddleware,  isStaff, updateSupplier);
router.delete('/:id', authMiddleware, isAdmin, deleteSupplier);

module.exports = router;