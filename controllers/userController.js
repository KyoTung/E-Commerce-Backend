const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler")
const createUser = asyncHandler(
    async (req, res) => {
        try {
          const email = req.body.email;
          const findUser = await User.findOne({ email: email });
          if (!findUser) {
            // Create a new user
            const newUser = await User.create(req.body);
            res.json({
              msg: "User created successfully",
              success: true,
              user: newUser,
            });
          } else {
            throw new Error("User already exists");
          }
        } catch (error) {
          res.status(500).json({
            msg: "Server error",
            error: error.message,
            success: false,
          });
        }
      });

module.exports = { createUser };
