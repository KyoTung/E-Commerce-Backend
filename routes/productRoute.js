const express = require("express");
const { isAdmin, authMiddleware, isStaff } = require("../middleware/authMiddleWare");
const {
  createProduct,
  getAProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishList,
  rating,
  uploadImagesProduct,
  deleteImagesProduct,
  getAllProductsAdmin
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
  isStaff,
  uploadPhoto.array("images", 10),
  productImgResize,
  uploadImagesProduct
);
router.post("/", authMiddleware,  isStaff, createProduct);
router.get("/admin", authMiddleware,  isStaff, getAllProductsAdmin);
router.get("/:id", getAProduct);
router.get("/", getAllProduct);

router.put("/wishlist", authMiddleware, addToWishList);
router.put("/rating", authMiddleware, rating);

router.put("/:id", authMiddleware,  isStaff, updateProduct);
router.delete("/:id", authMiddleware, isAdmin, deleteProduct);
router.delete("/delete-images/:id/:publicIdToDelete", authMiddleware, isStaff, deleteImagesProduct);

module.exports = router;


