const jwt = require('jsonwebtoken');


const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      sub: user._id.toString(), 
      role: user.role,          
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' } 
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' } 
  );
};

module.exports = { generateAccessToken, generateRefreshToken };