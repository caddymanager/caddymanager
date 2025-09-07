import { defineStore } from 'pinia';
import auditLogService from '../services/auditLogService';

export const useAuditLogStore = defineStore('auditLog', {
  state: () => ({
    auditLogs: [],
    currentAuditLog: null,
    loading: false,
    error: null,
    filterOptions: {
      actions: [],
      resourceTypes: [],
      users: []
    },
    pagination: {
      total: 0,
      page: 1,
      pageSize: 20
    }
  }),
  
  getters: {
    getAuditLogById: (state) => (id) => {
      return state.auditLogs.find(log => log._id === id);
    }
  },
  
  actions: {
    async fetchAuditLogs(query = {}) {
      this.loading = true;
      this.error = null;
      
      try {
        console.log('Fetching audit logs with query:', query);
        
        const response = await auditLogService.getAuditLogs(query);
        console.log('Audit logs response:', response);
        
        // Store the audit logs and metadata
        this.auditLogs = response.auditLogs || [];
        this.pagination = {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 20
        };
        
        return {
          auditLogs: this.auditLogs,
          ...this.pagination
        };
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        this.error = error.message || 'Failed to fetch audit logs';
        this.auditLogs = []; // Reset to empty array on error
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchAuditLog(id) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await auditLogService.getAuditLog(id);
        this.currentAuditLog = response.auditLog;
        return response.auditLog;
      } catch (error) {
        // If the server returns 404 (not found), treat it as a graceful missing resource
        if (error && error.response && error.response.status === 404) {
          console.warn(`Audit log ${id} not found (404)`);
          this.currentAuditLog = null;
          this.error = 'Not found';
          return null;
        }
        console.error(`Error fetching audit log ${id}:`, error);
        this.error = error.message || 'Failed to fetch audit log details';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchFilterOptions() {
      try {
        console.log('Fetching audit log filter options');
        const response = await auditLogService.getFilterOptions();
        console.log('Filter options response:', response);
        
        if (response && response.options) {
          this.filterOptions = response.options;
          return response.options;
        }
        
        return this.filterOptions;
      } catch (error) {
        console.error('Error fetching filter options:', error);
        // Return current options if API call fails
        return this.filterOptions;
      }
    },
    
    async fetchResourceAuditLogs(resourceType, resourceId, query = {}) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await auditLogService.getResourceAuditLogs(resourceType, resourceId, query);
        
        // Store the audit logs and metadata
        this.auditLogs = response.auditLogs || [];
        this.pagination = {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 20
        };
        
        return {
          auditLogs: this.auditLogs,
          ...this.pagination
        };
      } catch (error) {
        console.error(`Error fetching audit logs for resource ${resourceType}/${resourceId}:`, error);
        this.error = error.message || 'Failed to fetch resource audit logs';
        this.auditLogs = []; // Reset to empty array on error
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchUserAuditLogs(userId, query = {}) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await auditLogService.getUserAuditLogs(userId, query);
        
        // Store the audit logs and metadata
        this.auditLogs = response.auditLogs || [];
        this.pagination = {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 20
        };
        
        return {
          auditLogs: this.auditLogs,
          ...this.pagination
        };
      } catch (error) {
        console.error(`Error fetching audit logs for user ${userId}:`, error);
        this.error = error.message || 'Failed to fetch user audit logs';
        this.auditLogs = []; // Reset to empty array on error
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchAuditStats() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await auditLogService.getAuditStats();
        return response.stats;
      } catch (error) {
        console.error('Error fetching audit log statistics:', error);
        this.error = error.message || 'Failed to fetch audit log statistics';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    clearError() {
      this.error = null;
    }
  }
});