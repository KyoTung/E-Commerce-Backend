
// utils/jwt.js
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  // payload tối giản để giảm rủi ro
  return jwt.sign(
    { sub: user._id.toString(), role: user.role }, // sub = subject
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' } 
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
