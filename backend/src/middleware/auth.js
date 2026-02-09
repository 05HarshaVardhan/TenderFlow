
  //backend\src\middleware\auth.js
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');

  async function auth(req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';

      // Expect "Bearer <token>"
      const [scheme, token] = authHeader.split(' ');

      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Verify token
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Optional: fetch user from DB to ensure still exists and isActive
      const user = await User.findById(payload.userId).populate('company');

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      // Attach simplified user context to request
      req.user = {
        id: user._id,
        role: user.role,
        companyId: user.company._id,
        companyName: user.company.name,
      };

      next();
    } catch (err) {
      console.error('Auth middleware error:', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  module.exports = auth;
