
const auditLogRepository = require('../repositories/auditLogRepository');

/**
 * Audit Service - Logs user actions that change data in the system
 * Excludes monitoring operations such as ping services
 */

const skipActions = ['ping', 'healthCheck', 'statusCheck'];

const auditService = {
  /**
   * Log an audit event
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
    try {
      if (skipActions.includes(action)) {
        return null;
      }
      // Normalize user object for both DBs
      const log = {
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
      };
      return await auditLogRepository.create(log);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  },

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs({ filter = {}, limit = 100, skip = 0, sort = { timestamp: -1 } } = {}) {
    try {
      // Only basic filter, limit, skip, sort supported for now
      // For SQLite, sort is always by timestamp desc
      const logs = await auditLogRepository.findAll({ limit, offset: skip });
      // For basic implementation, just return what we got
      const total = logs.length;
      return {
        logs,
        pagination: {
          total,
          limit,
          skip,
          hasMore: logs.length === limit // Rough estimate - there might be more if we got a full page
        }
      };
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  },

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(resourceType, resourceId, options = {}) {
    return auditLogRepository.findByResource(resourceType, resourceId, options);
  },

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId, options = {}) {
    return auditLogRepository.findByUser(userId, options);
  },

  /**
   * Get statistics about actions in the audit logs
   */
  async getActionStats() {
    const stats = await auditLogRepository.getStats();
    return stats.byAction || [];
  },

  /**
   * Get statistics about resources in the audit logs
   */
  async getResourceStats() {
    const stats = await auditLogRepository.getStats();
    return stats.byResourceType || [];
  },

  /**
   * Get statistics about users in the audit logs
   */
  async getUserStats(limit = 10) {
    // Not implemented in SQLite, only available in MongoDB
    if (typeof auditLogRepository.getUserStats === 'function') {
      return auditLogRepository.getUserStats(limit);
    }
    return [];
  },

  /**
   * Get daily activity counts for the past days
   */
  async getDailyActivity(days = 30) {
    // Not implemented in SQLite, only available in MongoDB
    if (typeof auditLogRepository.getDailyActivity === 'function') {
      return auditLogRepository.getDailyActivity(days);
    }
    return [];
  },

  /**
   * Get unique values for a field in the audit logs
   */
  async getUniqueValues(field) {
    if (typeof auditLogRepository.getUniqueValues === 'function') {
      return auditLogRepository.getUniqueValues(field);
    }
    return [];
  },

  /**
   * Get unique users from the audit logs
   */
  async getUniqueUsers(limit = 50) {
    if (typeof auditLogRepository.getUniqueUsers === 'function') {
      return auditLogRepository.getUniqueUsers(limit);
    }
    return [];
  }
};

module.exports = auditService;