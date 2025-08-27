const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createBlogcategory, 
    updateBlogcategory, 
    getAllBlogCategory, 
    getBlogCategory, 
    deleteBlogCategory } = require("../controller/blogcateController")


router.post("/", authMiddleware, isAdmin, createBlogcategory);
router.put("/:id",authMiddleware, isAdmin,updateBlogcategory )
router.get("/", getAllBlogCategory)
router.get("/:id", getBlogCategory)
router.delete("/:id", authMiddleware, isAdmin, deleteBlogCategory);



module.exports = router;