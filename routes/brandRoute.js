const express = require("express");
const { isAdmin, isStaff, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createBrand, 
    updateBrand, 
    getAllBrand, 
    getBrand,
    deleteBrand } = require("../controller/brandController")


router.post("/", authMiddleware, isStaff, createBrand);
router.put("/:id",authMiddleware, isStaff, updateBrand )
router.get("/", getAllBrand)
router.get("/:id", getBrand)
router.delete("/:id", authMiddleware, isAdmin, deleteBrand);



module.exports = router;