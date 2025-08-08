const ApiKey = require('../models/apiKey/apiKeyMongoModel');
const User = require('../models/user/userMongoModel');
const auditService = require('../services/auditService');

// Create a new API key
exports.createApiKey = async (req, res) => {
  try {
    const { name, permissions, expiration } = req.body;
    
    // Validate name
    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'API key name must be at least 3 characters long'
      });
    }
    
    // Parse expiration date if provided
    let expirationDate = null;
    if (expiration) {
      expirationDate = new Date(expiration);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expiration date'
        });
      }
    }
    
    // Create the API key
    const apiKey = await ApiKey.createApiKey(
      req.user.id,
      name,
      permissions,
      expirationDate
    );
    
    // Log the API key creation in audit logs
    await auditService.logAction({
      action: 'create_api_key',
      user: req.user,
      resourceType: 'apiKey',
      resourceId: apiKey._id,
      details: {
        name: apiKey.name,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt
      },
      statusCode: 201,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Return the API key (only once, as we won't show the full key again)
    res.status(201).json({
      success: true,
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        key: apiKey.key, // This is the only time we'll send the full key back
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      message: 'API key created successfully. Please save this key as it won\'t be shown again.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating API key',
      error: error.message
    });
  }
};

// Get all API keys for a user
exports.getApiKeys = async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ userId: req.user.id })
      .select('-key') // Don't return the actual key
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: apiKeys.length,
      apiKeys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving API keys',
      error: error.message
    });
  }
};

// Get a single API key by ID
exports.getApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('-key');
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    res.status(200).json({
      success: true,
      apiKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving API key',
      error: error.message
    });
  }
};

// Update an API key
exports.updateApiKey = async (req, res) => {
  try {
    const { name, permissions, isActive } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (permissions) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    ).select('-key');
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    // Log the API key update in audit logs
    await auditService.logAction({
      action: 'update_api_key',
      user: req.user,
      resourceType: 'apiKey',
      resourceId: apiKey._id,
      details: {
        updates: updateData,
        name: apiKey.name
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      apiKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating API key',
      error: error.message
    });
  }
};

// Delete an API key
exports.deleteApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    // Log the API key deletion in audit logs
    await auditService.logAction({
      action: 'delete_api_key',
      user: req.user,
      resourceType: 'apiKey',
      resourceId: apiKey._id,
      details: {
        name: apiKey.name
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting API key',
      error: error.message
    });
  }
};

// Admin: Get all API keys
exports.getAllApiKeys = async (req, res) => {
  try {
    const apiKeys = await ApiKey.find()
      .select('-key')
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: apiKeys.length,
      apiKeys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving API keys',
      error: error.message
    });
  }
};

// Revoke an API key (admin only)
exports.revokeApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-key');
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    // Log the API key revocation in audit logs
    await auditService.logAction({
      action: 'revoke_api_key',
      user: req.user,
      resourceType: 'apiKey',
      resourceId: apiKey._id,
      details: {
        name: apiKey.name
      },
      statusCode: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      apiKey,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error revoking API key',
      error: error.message
    });
  }
};