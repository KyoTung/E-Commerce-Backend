const jwt = require("jsonwebtoken")
const dotenv = require("dotenv");
dotenv.config();


// const generateRefreshToken = (id) =>{
//   return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {expiresIn: "30d"});
// }
const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' } 
  );
};
module.exports = { generateRefreshToken };