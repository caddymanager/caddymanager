const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const auditService = require('../services/auditService');

// Environment variables - should be properly configured in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_for_development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists with password field selected
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      // Log failed login attempt
      await auditService.logAction({
        action: 'login_failed',
        user: { username: username, id: null },
        resourceType: 'user',
        resourceId: null,
        details: {
          reason: 'User not found',
          username: username
        },
        statusCode: 401,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed login attempt with invalid password
      await auditService.logAction({
        action: 'login_failed',
        user: { username: username, id: user._id },
        resourceType: 'user',
        resourceId: user._id,
        details: {
          reason: 'Invalid password',
          username: username
        },
        statusCode: 401,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Update last login time
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Log successful login
    await auditService.logAction({
      action: 'login_success',
      user: user,
      resourceType: 'user',
      resourceId: user._id,
      details: {
        username: user.username
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const updateData = {};
    
    // If username is provided, check if it's already taken
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      updateData.username = username;
    }
    
    // If email is provided, check if it's already taken
    if (email) {
      const existingEmail = await User.findOne({ 
        email, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      
      updateData.email = email;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log profile update
    await auditService.logAction({
      action: 'update_profile',
      user: req.user,
      resourceType: 'user',
      resourceId: user._id,
      details: {
        updates: updateData
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Log password change
    await auditService.logAction({
      action: 'change_password',
      user: req.user,
      resourceType: 'user',
      resourceId: user._id,
      details: {
        passwordChanged: true
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message
    });
  }
};

// Admin: Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log role update
    await auditService.logAction({
      action: 'update_user_role',
      user: req.user,
      resourceType: 'user',
      resourceId: user._id,
      details: {
        username: user.username,
        newRole: role,
        updatedBy: req.user.username
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

// Admin: Create a new user (direct creation by admin)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate role if provided
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Only check for duplicate emails if an email is provided and not empty
    if (email && email.trim() !== '') {
      const emailExists = await User.findOne({ 
        email: email.trim().toLowerCase() 
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Prepare user data for creation
    const userData = {
      username,
      password,
      role: role || 'user'
    };

    // Only add email field if it's a non-empty value
    // Empty values will be handled by the pre-save hook in the model
    if (email && email.trim() !== '') {
      userData.email = email.trim().toLowerCase();
    }

    // Create the user
    const user = await User.create(userData);

    // Log user creation
    await auditService.logAction({
      action: 'create_user',
      user: req.user,
      resourceType: 'user',
      resourceId: user._id,
      details: {
        username: user.username,
        role: user.role,
        createdBy: req.user.username
      },
      statusCode: 201,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// Admin: Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deletion of own account
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Find the user to check if they exist
    const userToDelete = await User.findById(userId);
    
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log user deletion before actual deletion
    await auditService.logAction({
      action: 'delete_user',
      user: req.user,
      resourceType: 'user',
      resourceId: userId,
      details: {
        deletedUsername: userToDelete.username,
        deletedByUsername: req.user.username
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};