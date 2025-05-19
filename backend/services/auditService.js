const AuditLog = require('../models/auditLogModel');
const mongoose = require('mongoose');

/**
 * Audit Service - Logs user actions that change data in the system
 * Excludes monitoring operations such as ping services
 */
class AuditService {
  constructor() {
    // Don't initialize immediately, wait for MongoDB connection
    this.initialized = false;
    
    // Set up a connection event listener to initialize once connected
    mongoose.connection.on('connected', () => {
      if (!this.initialized) {
        this.initializeAuditCollection().then(() => {
          console.log('Audit log collection initialized successfully');
        }).catch(err => {
          console.error('Failed to initialize audit log collection:', err);
        });
      }
    });
    
    // If mongoose is already connected, initialize now
    if (mongoose.connection.readyState === 1) {
      this.initializeAuditCollection().then(() => {
        console.log('Audit log collection initialized successfully');
      }).catch(err => {
        console.error('Failed to initialize audit log collection:', err);
      });
    }
  }

  /**
   * Initialize the audit log collection with the configured size limit
   */
  async initializeAuditCollection() {
    try {
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        console.log('MongoDB not connected yet, will initialize audit collection when connected');
        return;
      }
      
      this.initialized = true;
      
      // Get the configured audit log max size from environment variables
      const maxSizeMB = parseInt(process.env.AUDIT_LOG_MAX_SIZE_MB, 10) || 100;
      
      // Check if the collection exists and is already capped
      const collections = await mongoose.connection.db.listCollections({ name: 'auditlogs' }).toArray();
      
      if (collections.length > 0) {
        const collInfo = collections[0];
        
        // If collection exists but is not capped, convert it
        if (!collInfo.options.capped) {
          console.log('Converting audit logs collection to capped collection');
          await mongoose.connection.db.command({
            convertToCapped: 'auditlogs',
            size: maxSizeMB * 1024 * 1024
          });
        }
      } else {
        // Create the capped collection if it doesn't exist
        console.log(`Creating capped audit logs collection with max size: ${maxSizeMB} MB`);
        await mongoose.connection.db.createCollection('auditlogs', {
          capped: true,
          size: maxSizeMB * 1024 * 1024
        });
      }
      
      // Create expiration index if AUDIT_LOG_RETENTION_DAYS is set
      const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10);
      if (retentionDays) {
        await AuditLog.collection.createIndex(
          { timestamp: 1 },
          { expireAfterSeconds: retentionDays * 24 * 60 * 60 }
        );
        console.log(`Set audit log retention period to ${retentionDays} days`);
      }
    } catch (error) {
      console.error('Failed to initialize audit log collection:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Log an audit event
   * @param {Object} options - Audit log options
   * @param {string} options.action - The action being performed
   * @param {Object} options.user - The user performing the action
   * @param {string} options.resourceType - Type of resource being affected
   * @param {string} options.resourceId - ID of the resource being affected
   * @param {Object} options.details - Additional details about the action
   * @param {number} options.statusCode - HTTP status code of the response
   * @param {string} options.ipAddress - IP address of the user
   * @param {string} options.userAgent - User agent of the request
   * @returns {Promise<Object>} The created audit log entry
   */
  async logAction({
    action,
    user,
    resourceType,
    resourceId,
    details,
    statusCode,
    ipAddress,
    userAgent
  }) {
    // Ensure MongoDB is connected before trying to log
    if (mongoose.connection.readyState !== 1) {
      console.warn('Cannot log audit event: MongoDB not connected');
      return null;
    }

    try {
      // Skip logging for blacklisted actions (like ping operations)
      const skipActions = ['ping', 'healthCheck', 'statusCheck'];
      if (skipActions.includes(action)) {
        return null;
      }

      // Create the audit log entry
      const auditLog = new AuditLog({
        action,
        user: {
          userId: user?.id || user?._id,
          username: user?.username || 'system'
        },
        resourceType,
        resourceId: resourceId?.toString() || null,
        details,
        statusCode,
        ipAddress,
        userAgent
      });

      // Save and return the audit log entry
      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Get audit logs with filtering and pagination
   * @param {Object} options - Query options
   * @param {Object} options.filter - Filter criteria
   * @param {number} options.limit - Maximum number of results to return
   * @param {number} options.skip - Number of results to skip
   * @param {Object} options.sort - Sort criteria
   * @returns {Promise<Array>} Array of audit logs
   */
  async getAuditLogs({ filter = {}, limit = 100, skip = 0, sort = { timestamp: -1 } }) {
    try {
      const logs = await AuditLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
        
      const total = await AuditLog.countDocuments(filter);
      
      return {
        logs,
        pagination: {
          total,
          limit,
          skip,
          hasMore: total > skip + limit
        }
      };
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   * @param {string} resourceType - Type of resource
   * @param {string} resourceId - ID of the resource
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audit logs for the resource
   */
  async getResourceAuditLogs(resourceType, resourceId, options = {}) {
    const filter = { resourceType, resourceId: resourceId.toString() };
    return this.getAuditLogs({ ...options, filter });
  }

  /**
   * Get audit logs for a specific user
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audit logs for the user
   */
  async getUserAuditLogs(userId, options = {}) {
    const filter = { 'user.userId': userId };
    return this.getAuditLogs({ ...options, filter });
  }
  
  /**
   * Get statistics about actions in the audit logs
   * @returns {Promise<Array>} Array of action counts
   */
  async getActionStats() {
    try {
      const stats = await AuditLog.aggregate([
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return stats.map(item => ({
        action: item._id,
        count: item.count
      }));
    } catch (error) {
      console.error('Error getting action stats:', error);
      throw error;
    }
  }
  
  /**
   * Get statistics about resources in the audit logs
   * @returns {Promise<Array>} Array of resource type counts
   */
  async getResourceStats() {
    try {
      const stats = await AuditLog.aggregate([
        {
          $group: {
            _id: '$resourceType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return stats.map(item => ({
        resourceType: item._id,
        count: item.count
      }));
    } catch (error) {
      console.error('Error getting resource stats:', error);
      throw error;
    }
  }
  
  /**
   * Get statistics about users in the audit logs
   * @param {number} limit - Maximum number of users to return
   * @returns {Promise<Array>} Array of user activity counts
   */
  async getUserStats(limit = 10) {
    try {
      const stats = await AuditLog.aggregate([
        {
          $group: {
            _id: {
              userId: '$user.userId',
              username: '$user.username'
            },
            count: { $sum: 1 },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        }
      ]);
      
      return stats.map(item => ({
        userId: item._id.userId,
        username: item._id.username,
        count: item.count,
        lastActivity: item.lastActivity
      }));
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
  
  /**
   * Get daily activity counts for the past days
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Array of daily activity counts
   */
  async getDailyActivity(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const stats = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { 
            '_id.year': 1,
            '_id.month': 1,
            '_id.day': 1
          }
        }
      ]);
      
      // Format the results
      return stats.map(item => {
        const date = new Date(
          item._id.year,
          item._id.month - 1,
          item._id.day
        );
        
        return {
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          count: item.count
        };
      });
    } catch (error) {
      console.error('Error getting daily activity:', error);
      throw error;
    }
  }
  
  /**
   * Get unique values for a field in the audit logs
   * @param {string} field - Field name to get unique values for
   * @returns {Promise<Array>} Array of unique values
   */
  async getUniqueValues(field) {
    try {
      const values = await AuditLog.distinct(field);
      return values.sort();
    } catch (error) {
      console.error(`Error getting unique values for ${field}:`, error);
      throw error;
    }
  }
  
  /**
   * Get unique users from the audit logs
   * @param {number} limit - Maximum number of users to return
   * @returns {Promise<Array>} Array of unique users
   */
  async getUniqueUsers(limit = 50) {
    try {
      const users = await AuditLog.aggregate([
        {
          $group: {
            _id: {
              userId: '$user.userId',
              username: '$user.username'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        }
      ]);
      
      return users.map(user => ({
        userId: user._id.userId,
        username: user._id.username,
        count: user.count
      }));
    } catch (error) {
      console.error('Error getting unique users:', error);
      throw error;
    }
  }
}

// Export a singleton instance
module.exports = new AuditService();