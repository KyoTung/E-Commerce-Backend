const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const {
  createBlog,
  updateBlog,
  getAllBlogs,
  getBlog,
  deleteBlog,
  likeBlog,
  dislikeBlog,
  uploadImages,
  deleteImages
} = require("../controller/blogController");
const {
  uploadPhoto,
  blogImgResize,
} = require("../middleware/uploadImage");

const router = express.Router();

router.post("/", authMiddleware, isAdmin, createBlog);
router.put(
  "/upload",
  authMiddleware,
  isAdmin,
  uploadPhoto.array("images", 10),
  blogImgResize,
  uploadImages
);
router.put("/likes", authMiddleware, likeBlog);
router.put("/dislikes", authMiddleware, dislikeBlog);
router.put("/:id", authMiddleware, isAdmin, updateBlog);
router.get("/:id", getBlog);
router.get("/", getAllBlogs);
router.delete("/:id", authMiddleware, isAdmin, deleteBlog);
router.delete("/delete-images/:id/:publicIdToDelete", authMiddleware, isAdmin, deleteImages);




module.exports = router;
