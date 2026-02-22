const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
// HTTP Authentication Middleware
function auth(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
 
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No token provided' });
  }
 
  // Verify token and get user
  verifyToken(token)
    .then(({ user, error }) => {
      if (error) {
        return res.status(401).json({ message: error });
      }
 
      // Attach user context to request
      req.user = {
        id: user._id,
        userId: user._id,
        role: user.role,
        companyId: user.company?._id,
        companyName: user.company?.name,
      };
 
      next();
    })
    .catch(error => {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Authentication error' });
    });
}

// WebSocket Authentication Middleware
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token || 
                 (socket.handshake.headers.authorization || '').split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token and get user
    const { user, error } = await verifyToken(token);
    if (error) {
      return next(new Error(`Authentication error: ${error}`));
    }

    const userTeams = await Team.find({ members: user._id }).select('_id');
    userTeams.forEach(team => {
      socket.join(`team_${team._id}`);
    });
    // Attach user to socket for later use
    socket.userId = user._id;
    socket.role = user.role;
    socket.companyId = user.company._id;

    // Join user to their own room for direct messaging
    socket.join(user._id.toString());
    
    // Join company room for company-wide broadcasts
    if (user.company) {
      socket.join(`company_${user.company._id}`);
    }

    
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
}

// Helper function to verify token and get user
async function verifyToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from DB to ensure still exists and isActive
    const user = await User.findById(payload.userId).populate('company');
    
    if (!user) {
      return { error: 'User not found' };
    }
    
    if (!user.isActive) {
      return { error: 'User account is not active' };
    }

    return { user };
  } catch (error) {
    console.error('Token verification error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return { error: 'Token expired' };
    }
    return { error: 'Invalid token' };
  }
}

module.exports = {
  auth,
  authenticateSocket,
  verifyToken
};
