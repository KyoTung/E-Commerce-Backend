const express = require("express");
const { isAdmin, authMiddleware, isStaff } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createBlogcategory, 
    updateBlogcategory, 
    getAllBlogCategory, 
    getBlogCategory, 
    deleteBlogCategory } = require("../controller/blogcateController")


router.post("/", authMiddleware, isStaff, createBlogcategory);
router.put("/:id",authMiddleware, isStaff,updateBlogcategory )
router.get("/", getAllBlogCategory)
router.get("/:id", getBlogCategory)
router.delete("/:id", authMiddleware, isAdmin, deleteBlogCategory);



module.exports = router;