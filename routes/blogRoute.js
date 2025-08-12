const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const {createBlog} = require("../controller/blogController")

const router = express.Router();

router.post("/",authMiddleware, isAdmin, createBlog);

module.exports = router;