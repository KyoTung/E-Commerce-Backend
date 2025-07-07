const express = require("express");
const router = express.Router();

const {createProduct} = require("../controller/productController")


router.post('/add', createProduct);




module.exports = router;