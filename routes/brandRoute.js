const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createBrand, 
    updateBrand, 
    getAllBrand, 
    getBrand,
    deleteBrand } = require("../controller/brandController")


router.post("/", authMiddleware, isAdmin, createBrand);
router.put("/:id",authMiddleware, isAdmin,updateBrand )
router.get("/", getAllBrand)
router.get("/:id", getBrand)
router.delete("/:id", authMiddleware, isAdmin, deleteBrand);



module.exports = router;