const jwt = require("jsonwebtoken")
const dotenv = require("dotenv");
dotenv.config();


const generateRefreshToken = (id) =>{
  return jwt.sign({ id }, process.env.JWT_SECRET, {expiresIn: "3d"});
}

module.exports = { generateRefreshToken };