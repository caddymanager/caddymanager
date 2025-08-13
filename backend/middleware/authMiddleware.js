const jwt = require('jsonwebtoken');
const User = require('../database/models/userModel');
const ApiKey = require('../database/models/apiKeyModel');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_for_development';

// Protect routes - supports both JWT and API key authentication
exports.protect = async (req, res, next) => {
  try {
    let token;
    let isApiKey = false;
    
    // Check if token exists in headers
    if (req.headers.authorization) {
      // Check if it's a Bearer token (JWT)
      if (req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } 
      // Check if it's an API key
      else if (req.headers.authorization.startsWith('ApiKey')) {
        token = req.headers.authorization.split(' ')[1];
        isApiKey = true;
      }
    }
    
    // Also check for x-api-key header for API keys
    if (!token && req.headers['x-api-key']) {
      token = req.headers['x-api-key'];
      isApiKey = true;
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    try {
      if (isApiKey) {
        // Validate API key
        const apiKey = await ApiKey.validateApiKey(token);
        
        if (!apiKey) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired API key'
          });
        }
        
        // Get the user associated with this API key
        const user = await User.findById(apiKey.userId);
        
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User associated with this API key is inactive or does not exist'
          });
        }
        
        // Add user and API key info to request
        req.user = {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isApiRequest: true,
          apiKey: {
            id: apiKey._id,
            name: apiKey.name,
            permissions: apiKey.permissions
          }
        };
      } else {
        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user still exists
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User no longer exists'
          });
        }
        
        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User account is disabled'
          });
        }
        
        // Add user to request
        req.user = {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isApiRequest: false
        };
      }
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Authorize by role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user ? req.user.role : 'undefined'} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check API key permissions
exports.checkApiPermission = (permission) => {
  return (req, res, next) => {
    // Skip permission check if it's not an API request
    if (!req.user.isApiRequest) {
      return next();
    }
    
    // Check if the API key has the required permission
    if (!req.user.apiKey.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `API key doesn't have ${permission} permission`
      });
    }
    
    next();
  };
};