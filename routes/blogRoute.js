const express = require("express");
const { isAdmin, authMiddleware, isStaff } = require("../middleware/authMiddleWare");

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

router.post("/", authMiddleware, isStaff, createBlog);
router.put(
  "/upload",
  authMiddleware,
  isStaff,
  uploadPhoto.array("images", 10),
  blogImgResize,
  uploadImages
);
router.put("/likes", authMiddleware, likeBlog);
router.put("/dislikes", authMiddleware, dislikeBlog);
router.put("/:id", authMiddleware, isStaff, updateBlog);
router.get("/:id", getBlog);
router.get("/", getAllBlogs);
router.delete("/:id", authMiddleware, isAdmin, deleteBlog);
router.delete("/delete-images/:id/:publicIdToDelete", authMiddleware, isAdmin, deleteImages);




module.exports = router;
