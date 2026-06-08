const express = require("express");
const { isAdmin, authMiddleware, isStaff } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createCategory, 
    updateCategory, 
    getAllCategory, 
    getCategory,
    deleteCategory
     } = require("../controller/categoryController")



router.post("/", authMiddleware, isStaff, createCategory);
router.put("/:id",authMiddleware,  isStaff, updateCategory )
router.get("/", getAllCategory)
router.get("/:id", getCategory)
router.delete("/:id", authMiddleware, isAdmin, deleteCategory);




module.exports = router;