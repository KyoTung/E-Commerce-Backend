const mongoose = require("mongoose");
const bcrypt = require("bcrypt")
const crypto = require("crypto")

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
    address: {
      type: String
    },
    wishlist: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product" 
    }],
    refreshToken:{
      type:String,
    },
    passwordChangeAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function(next){
  if(!this.isModified('password')){
    next();
  }
   const salt = await bcrypt.genSaltSync(10)
   this.password = await bcrypt.hash(this.password, salt);
   next();
})
userSchema.methods.isPasswordMatched = async function(enterPassword) {
  return await bcrypt.compare(enterPassword, this.password)
}
userSchema.methods.createResetToken = async function(){
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetExpires = Date.now() + 30*60*1000;  //10 minute
  return resetToken
}

module.exports = mongoose.model("User", userSchema);