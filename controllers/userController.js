
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler")
const {generatelToken} = require("../config/jwtToken")

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

const loginUserController = asyncHandler(async(req, res) =>{
    const {email, password} = req.body
    const findUser = await User.findOne({ email: email });

    if(findUser){
      res.json({
        _id: findUser?._id,
        fullName: findUser?.$assertPopulated,
        email: findUser?.$assertPopulated,
        address: findUser?.address,
        phone: findUser?.phone,
        token: generatelToken(findUser?._id)
      });
    } else {
        throw new Element("Invalid Crendentials!")
    }
});






module.exports = { createUser, loginUserController };
