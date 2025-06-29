const auditService = require('../services/auditService');

/**
 * Audit Log Controller - Handles requests related to audit logs
 */
const auditLogController = {
  /**
   * Get audit logs with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAuditLogs: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'timestamp',
        order = 'desc',
        action,
        resourceType,
        resourceId,
        userId,
        username,
        startDate,
        endDate
      } = req.query;

      // Build filter from query parameters
      const filter = {};
      
      if (action) {
        filter.action = action;
      }
      
      if (resourceType) {
        filter.resourceType = resourceType;
      }
      
      if (resourceId) {
        filter.resourceId = resourceId;
      }
      
      if (userId) {
        filter['user.userId'] = userId;
      }
      
      if (username) {
        filter['user.username'] = { $regex: username, $options: 'i' };
      }
      
      // Handle date range filter
      if (startDate || endDate) {
        filter.timestamp = {};
        
        if (startDate) {
          filter.timestamp.$gte = new Date(startDate);
        }
        
        if (endDate) {
          filter.timestamp.$lte = new Date(endDate);
        }
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build sort options
      const sortOptions = {};
      sortOptions[sort] = order === 'asc' ? 1 : -1;
      
      // Get audit logs with pagination
      const result = await auditService.getAuditLogs({
        filter,
        limit: parseInt(limit),
        skip,
        sort: sortOptions
      });
      
      res.status(200).json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving audit logs',
        error: error.message
      });
    }
  },
  
  /**
   * Get audit logs for a specific resource
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getResourceAuditLogs: async (req, res) => {
    try {
      const { resourceType, resourceId } = req.params;
      const { 
        page = 1, 
        limit = 20,
        sort = 'timestamp',
        order = 'desc'
      } = req.query;
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build sort options
      const sortOptions = {};
      sortOptions[sort] = order === 'asc' ? 1 : -1;
      
      // Get audit logs for the resource
      const result = await auditService.getResourceAuditLogs(
        resourceType,
        resourceId,
        {
          limit: parseInt(limit),
          skip,
          sort: sortOptions
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Resource audit logs retrieved successfully',
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error retrieving resource audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving resource audit logs',
        error: error.message
      });
    }
  },
  
  /**
   * Get audit logs for a specific user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getUserAuditLogs: async (req, res) => {
    try {
      const { userId } = req.params;
      const { 
        page = 1, 
        limit = 20,
        sort = 'timestamp',
        order = 'desc'
      } = req.query;
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build sort options
      const sortOptions = {};
      sortOptions[sort] = order === 'asc' ? 1 : -1;
      
      // Get audit logs for the user
      const result = await auditService.getUserAuditLogs(
        userId,
        {
          limit: parseInt(limit),
          skip,
          sort: sortOptions
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'User audit logs retrieved successfully',
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error retrieving user audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving user audit logs',
        error: error.message
      });
    }
  },
  
  /**
   * Get audit log statistics
   * @param {Object} req - Express request object 
   * @param {Object} res - Express response object
   */
  getAuditStats: async (req, res) => {
    try {
      // Get counts by action type
      const actionStats = await auditService.getActionStats();
      
      // Get counts by resource type
      const resourceStats = await auditService.getResourceStats();
      
      // Get counts by user
      const userStats = await auditService.getUserStats();

      // Get daily activity for the past 30 days
      const dailyActivity = await auditService.getDailyActivity();
      
      res.status(200).json({
        success: true,
        message: 'Audit log statistics retrieved successfully',
        data: {
          actionStats,
          resourceStats,
          userStats,
          dailyActivity
        }
      });
    } catch (error) {
      console.error('Error retrieving audit log statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving audit log statistics',
        error: error.message
      });
    }
  },
  
  /**
   * Get available filter options for audit logs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getFilterOptions: async (req, res) => {
    try {
      // Get unique actions
      const actions = await auditService.getUniqueValues('action');
      
      // Get unique resource types
      const resourceTypes = await auditService.getUniqueValues('resourceType');
      
      // Get unique users (limited to 50)
      const users = await auditService.getUniqueUsers(50);
      
      res.status(200).json({
        success: true,
        message: 'Filter options retrieved successfully',
        data: {
          actions,
          resourceTypes,
          users
        }
      });
    } catch (error) {
      console.error('Error retrieving filter options:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving filter options',
        error: error.message
      });
    }
  }
};

module.exports = auditLogController;