const mongoose = require("mongoose");
const bcrypt = require("bcrypt")

var userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique:true,
  },
  passWord: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
});

userSchema.pre('save', async function(next){
   const salt = await bcrypt.genSaltSync(10)
   this.passWord = await bcrypt.hash(this.passWord, salt);
})

module.exports = mongoose.model("User", userSchema);