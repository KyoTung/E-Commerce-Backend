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
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  role: {
    type: String,
    default:"user"
  },
});

userSchema.pre('save', async function(next){
   const salt = await bcrypt.genSaltSync(10)
   this.password = await bcrypt.hash(this.password, salt);
})
userSchema.methods.isPasswordMatched = async function(enterPassword) {
  return await bcrypt.compare(enterPassword, this.password)
}

module.exports = mongoose.model("User", userSchema);