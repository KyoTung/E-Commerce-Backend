const express = require("express");
const { isAdmin, authMiddleware } = require("../middleware/authMiddleWare");

const router = express.Router();
const {createOrder} = require("../controller/orderController")


router.post("/", authMiddleware, createOrder);
// router.put("/:id",authMiddleware, isAdmin, )
// router.get("/", )
// router.get("/:id", )
router.delete("/:id", authMiddleware, isAdmin);



module.exports = router;