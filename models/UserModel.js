const mongoose = require("mongoose");
const bcrypt = require("bcrypt")

var userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
    },
    role: {
      type: String,
      default: "user",
    },
    isBlock:{
      type:Boolean,
      default:false,
    },
    cart: {
      type: Array,
      default: [],
    },
    address: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Address" 
    }],
    wishList: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product" 
    }],
    refreshToken:{
      type:String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function(next){
   const salt = await bcrypt.genSaltSync(10)
   this.password = await bcrypt.hash(this.password, salt);
})
userSchema.methods.isPasswordMatched = async function(enterPassword) {
  return await bcrypt.compare(enterPassword, this.password)
}

module.exports = mongoose.model("User", userSchema);