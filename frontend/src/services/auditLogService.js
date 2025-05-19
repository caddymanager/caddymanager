import apiService from './apiService';

/**
 * Service for handling audit log API requests
 */
const auditLogService = {
  // Get all audit logs with optional filters
  async getAuditLogs(query = {}) {
    try {
      const response = await apiService.get('/audit-logs', query);
      return {
        auditLogs: response.data.data || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        pageSize: response.data.pagination?.limit || 20
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Get audit log by ID
  async getAuditLog(id) {
    try {
      const response = await apiService.get(`/audit-logs/${id}`);
      return {
        auditLog: response.data.data || {}
      };
    } catch (error) {
      console.error(`Error fetching audit log details for ID ${id}:`, error);
      throw error;
    }
  },

  // Get filter options for audit logs
  async getFilterOptions() {
    try {
      const response = await apiService.get('/audit-logs/filters');
      return {
        options: {
          actions: response.data.data?.actions || [],
          resourceTypes: response.data.data?.resourceTypes || [],
          users: response.data.data?.users || []
        }
      };
    } catch (error) {
      console.error('Error fetching audit log filter options:', error);
      throw error;
    }
  },

  // Get audit logs for a specific resource
  async getResourceAuditLogs(resourceType, resourceId, query = {}) {
    try {
      const response = await apiService.get(`/audit-logs/resource/${resourceType}/${resourceId}`, query);
      return {
        auditLogs: response.data.data || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        pageSize: response.data.pagination?.limit || 20
      };
    } catch (error) {
      console.error(`Error fetching audit logs for resource ${resourceType}/${resourceId}:`, error);
      throw error;
    }
  },

  // Get audit logs for a specific user
  async getUserAuditLogs(userId, query = {}) {
    try {
      const response = await apiService.get(`/audit-logs/user/${userId}`, query);
      return {
        auditLogs: response.data.data || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        pageSize: response.data.pagination?.limit || 20
      };
    } catch (error) {
      console.error(`Error fetching audit logs for user ${userId}:`, error);
      throw error;
    }
  },

  // Get audit log statistics
  async getAuditStats() {
    try {
      const response = await apiService.get('/audit-logs/stats');
      return {
        stats: response.data.data || {}
      };
    } catch (error) {
      console.error('Error fetching audit log statistics:', error);
      throw error;
    }
  }
};

export default auditLogService;