const express = require("express");
const router = express.Router();

const {
  createUser,
  loginUserController,
} = require("../controllers/userController");

router.post("/register", createUser);
router.get("/login", loginUserController);

module.exports = router;
