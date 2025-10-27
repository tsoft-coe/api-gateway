const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for health checks
    if (req.path === '/health' || req.path === '/metrics') {
      return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
        requestId: req.id
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');

    // Attach user info to request
    req.user = {
      userId: decoded.sub || decoded.userId,
      username: decoded.preferred_username || decoded.username,
      email: decoded.email,
      roles: decoded.realm_access?.roles || decoded.roles || []
    };

    logger.debug('User authenticated:', req.user.username);
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
        requestId: req.id
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        requestId: req.id
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
      requestId: req.id
    });
  }
};

module.exports = authMiddleware;
