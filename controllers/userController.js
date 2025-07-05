
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler")
const {generatelToken} = require("../config/jwtToken")

// Create a new user
const createUser = asyncHandler(
    async (req, res) => {
          const email = req.body.email;
          const findUser = await User.findOne({ email: email });
          if (!findUser) {
            const newUser = await User.create(req.body);
            res.json({
              msg: "User created successfully",
              success: true,
              user: newUser,
            });
          } else {
            throw new Error("User already exists");
          }
      });

      // login
const loginUserController = asyncHandler(async(req, res) =>{
    const {email, password} = req.body
    const findUser = await User.findOne({ email: email });

      if (findUser) {
        res.json({
          _id: findUser?._id,
          fullName: findUser?.$assertPopulated,
          email: findUser?.$assertPopulated,
          address: findUser?.address,
          phone: findUser?.phone,
          token: generatelToken(findUser?._id),
        });
      } else {
        throw new Element("Invalid Crendentials!");
      }
});

// get all users
const getAllUsers = asyncHandler(async(req, res) => {
    try{
        const allUsers = await User.find()
        res.json(allUsers)
    } 
    catch (error){
        throw new Error(error)
    }
})

// get a single user
const getUser = asyncHandler(async(req, res) => {
    const {id} = req.params;
    try {
      const user = await User.findById(id);
      res.json(user);
    } catch (error) {
      throw new Error(error);
    }
})

// delete a user
const deleteUser = asyncHandler(async(req, res) => {
    const {id} = req.params;
    try {
      const deleteUser = await User.findByIdAndDelete(id);
      res.json({
        message: "User deleted successfully",
        success: true
      });
    } catch (error) {
      throw new Error(error);
    }
})

//update a user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.user;
  try {
    const updateUser = await User.findByIdAndUpdate(
      id,
      {
        fullName: req?.body?.fullName,
        email: req?.body?.email,
        address: req?.body?.address,
        phone: req?.body?.phone,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User updated successfully",
      success: true,
      user:updateUser
    });
  } catch (error) {
    throw new Error(error);
  }
});

const blockUser = asyncHandler(async(req, res)=>{
   const {id} = req.params;
   try{
      const block = await User.findByIdAndUpdate(id,
        {isBlock:true},
        {new:true})
        res.json({
            message:"user blocked successfully!"
        })
   } catch (error){
        throw new Error(error)
   }
})

const unlockUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const unlock = await User.findByIdAndUpdate(
        id,
        { isBlock: false },
        { new: true }
      );
      res.json({
        message: "user unlocked successfully!",
      });
    } catch (error) {
      throw new Error(error);
    }
});




module.exports = {
  createUser,
  loginUserController,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  blockUser, 
  unlockUser,
};
