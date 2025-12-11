
// middleware/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized: missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET); // verify AT
    const user = await User.findById(payload.sub).select('_id email role fullName isBlock').lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized: user not found' });
    if (user.isBlock) return res.status(403).json({ message: 'Forbidden: user blocked' });

    req.user = user; // set minimal user info
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin only' });
  }
  next();
});

module.exports = { authMiddleware, isAdmin };
