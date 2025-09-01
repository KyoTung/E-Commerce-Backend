const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createOrder, getOrder, updateStatus} = require("../controller/orderController")


router.post("/", authMiddleware, createOrder);
router.get("/",authMiddleware, getOrder )
router.put("/:id",authMiddleware, isAdmin,updateStatus )


module.exports = router;