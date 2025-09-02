const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");
const {
  createProduct,
  getAProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishList,
  rating,
  uploadImagesProduct,
  deleteImagesProduct
} = require("../controller/productController");

const {
  uploadPhoto,
  productImgResize,
} = require("../middleware/uploadImage");

const router = express.Router();
router.put(
  "/upload-images",
  authMiddleware,
  isAdmin,
  uploadPhoto.array("images", 10),
  productImgResize,
  uploadImagesProduct
);
router.post("/", authMiddleware, isAdmin, createProduct);
router.get("/:id", getAProduct);
router.get("/", getAllProduct);
router.put("/wishlist", authMiddleware, addToWishList);
router.put("/rating", authMiddleware, rating);

router.put("/:id", authMiddleware, isAdmin, updateProduct);
router.delete("/:id", authMiddleware, isAdmin, deleteProduct);
router.delete("/delete-images/:id", authMiddleware, isAdmin, deleteImagesProduct);

module.exports = router;
