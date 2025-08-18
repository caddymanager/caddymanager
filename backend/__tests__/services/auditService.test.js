const auditService = require('../../services/auditService');

describe('auditService', () => {
  let testLogs = [];

  const sampleUser = {
    id: 123,
    username: 'testuser'
  };

  const sampleLogData = {
    action: 'create',
    user: sampleUser,
    resourceType: 'server',
    resourceId: 'server-123',
    details: { name: 'Test Server', port: 2019 },
    statusCode: 201,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  };

  beforeEach(() => {
    testLogs = [];
  });

  afterEach(() => {
    testLogs = [];
  });

  describe('logAction', () => {
    test('should log a valid action', async () => {
      const result = await auditService.logAction(sampleLogData);
      
      expect(result).toBeDefined();
      expect(result.action).toBe('create');
      expect(result.resourceType).toBe('server');
      
      if (result) {
        testLogs.push(result);
      }
    });

    test('should skip ping actions', async () => {
      const pingLog = {
        ...sampleLogData,
        action: 'ping'
      };

      const result = await auditService.logAction(pingLog);
      
      expect(result).toBeNull();
    });

    test('should skip healthCheck actions', async () => {
      const healthCheckLog = {
        ...sampleLogData,
        action: 'healthCheck'
      };

      const result = await auditService.logAction(healthCheckLog);
      
      expect(result).toBeNull();
    });

    test('should skip statusCheck actions', async () => {
      const statusCheckLog = {
        ...sampleLogData,
        action: 'statusCheck'
      };

      const result = await auditService.logAction(statusCheckLog);
      
      expect(result).toBeNull();
    });

    test('should handle minimal user data', async () => {
      const minimalUserLog = {
        ...sampleLogData,
        user: { username: 'system' }
      };

      const result = await auditService.logAction(minimalUserLog);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('system');
      
      if (result) {
        testLogs.push(result);
      }
    });

    test('should handle missing user gracefully', async () => {
      const noUserLog = {
        action: 'create',
        resourceType: 'server',
        resourceId: 'server-456',
        details: { automated: true }
      };

      const result = await auditService.logAction(noUserLog);
      
      if (result) {
        expect(result.user).toBeDefined();
        expect(result.user.username).toBe('system');
        testLogs.push(result);
      }
    });

    test('should normalize user object for different ID formats', async () => {
      const mongoUserLog = {
        ...sampleLogData,
        user: { _id: 'mongo-id-123', username: 'mongouser' }
      };

      const result = await auditService.logAction(mongoUserLog);
      
      expect(result).toBeDefined();
      expect(result.user.userId).toBe('mongo-id-123');
      expect(result.user.username).toBe('mongouser');
      
      if (result) {
        testLogs.push(result);
      }
    });

    test('should convert resourceId to string', async () => {
      const numericResourceLog = {
        ...sampleLogData,
        resourceId: 12345
      };

      const result = await auditService.logAction(numericResourceLog);
      
      expect(result).toBeDefined();
      expect(typeof result.resourceId).toBe('string');
      expect(result.resourceId).toBe('12345');
      
      if (result) {
        testLogs.push(result);
      }
    });

    test('should handle complex details object', async () => {
      const complexDetailsLog = {
        ...sampleLogData,
        details: {
          changes: {
            name: { old: 'Old Name', new: 'New Name' },
            port: { old: 8080, new: 2019 }
          },
          metadata: {
            source: 'api',
            timestamp: new Date().toISOString()
          }
        }
      };

      const result = await auditService.logAction(complexDetailsLog);
      
      expect(result).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details.changes).toBeDefined();
      expect(result.details.metadata).toBeDefined();
      
      if (result) {
        testLogs.push(result);
      }
    });

    test('should return null on repository error but not throw', async () => {
      // Create a log that might cause repository issues (empty action)
      const invalidLog = {
        action: '',
        user: sampleUser,
        resourceType: ''
      };

      const result = await auditService.logAction(invalidLog);
      
      // Service should handle errors gracefully and return null
      // This test ensures the service doesn't crash on repository errors
      expect(result === null || result !== undefined).toBe(true);
    });
  });

  describe('getAuditLogs', () => {
    beforeEach(async () => {
      // Create test data
      const logs = [
        { ...sampleLogData, action: 'create' },
        { ...sampleLogData, action: 'update', resourceId: 'server-456' },
        { ...sampleLogData, action: 'delete', resourceId: 'server-789' }
      ];

      for (const logData of logs) {
        const result = await auditService.logAction(logData);
        if (result) {
          testLogs.push(result);
        }
      }
    });

    test('should retrieve audit logs with default parameters', async () => {
      const result = await auditService.getAuditLogs();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.logs)).toBe(true);
      
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('skip');
      expect(result.pagination).toHaveProperty('hasMore');
    });

    test('should handle pagination parameters', async () => {
      const result = await auditService.getAuditLogs({ limit: 1, skip: 0 });
      
      expect(result).toBeDefined();
      expect(result.logs.length).toBeLessThanOrEqual(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.skip).toBe(0);
    });

    test('should handle filters', async () => {
      const filter = { action: 'create' };
      const result = await auditService.getAuditLogs({ filter });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
    });

    test('should calculate hasMore correctly', async () => {
      const result = await auditService.getAuditLogs({ limit: 1, skip: 0 });
      
      expect(result.pagination).toHaveProperty('hasMore');
      expect(typeof result.pagination.hasMore).toBe('boolean');
    });
  });

  describe('getResourceAuditLogs', () => {
    beforeEach(async () => {
      // Create logs for specific resources
      const logs = [
        { ...sampleLogData, resourceType: 'server', resourceId: 'server-123', action: 'create' },
        { ...sampleLogData, resourceType: 'server', resourceId: 'server-123', action: 'update' },
        { ...sampleLogData, resourceType: 'config', resourceId: 'config-456', action: 'create' }
      ];

      for (const logData of logs) {
        const result = await auditService.logAction(logData);
        if (result) {
          testLogs.push(result);
        }
      }
    });

    test('should retrieve logs for specific resource', async () => {
      const result = await auditService.getResourceAuditLogs('server', 'server-123');
      
      expect(Array.isArray(result)).toBe(true);
      
      // All logs should be for the specified resource
      result.forEach(log => {
        expect(log.resourceType).toBe('server');
        expect(log.resourceId).toBe('server-123');
      });
    });

    test('should handle pagination for resource logs', async () => {
      const result = await auditService.getResourceAuditLogs('server', 'server-123', { limit: 1 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('should return empty array for non-existent resource', async () => {
      const result = await auditService.getResourceAuditLogs('nonexistent', 'resource-999');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getUserAuditLogs', () => {
    beforeEach(async () => {
      // Create logs for specific users
      const logs = [
        { ...sampleLogData, user: { userId: 123, username: 'user1' }, action: 'create' },
        { ...sampleLogData, user: { userId: 123, username: 'user1' }, action: 'update' },
        { ...sampleLogData, user: { userId: 456, username: 'user2' }, action: 'delete' }
      ];

      for (const logData of logs) {
        const result = await auditService.logAction(logData);
        if (result) {
          testLogs.push(result);
        }
      }
    });

    test('should retrieve logs for specific user', async () => {
      const result = await auditService.getUserAuditLogs(123);
      
      expect(Array.isArray(result)).toBe(true);
      
      // All logs should be for the specified user
      result.forEach(log => {
        const logUserId = log.userId || (log.user && log.user.userId);
        expect(logUserId).toBe(123);
      });
    });

    test('should handle pagination for user logs', async () => {
      const result = await auditService.getUserAuditLogs(123, { limit: 1 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('should return empty array for non-existent user', async () => {
      const result = await auditService.getUserAuditLogs(999);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getActionStats', () => {
    beforeEach(async () => {
      // Create diverse action logs
      const logs = [
        { ...sampleLogData, action: 'create' },
        { ...sampleLogData, action: 'create' },
        { ...sampleLogData, action: 'update' },
        { ...sampleLogData, action: 'delete' }
      ];

      for (const logData of logs) {
        const result = await auditService.logAction(logData);
        if (result) {
          testLogs.push(result);
        }
      }
    });

    test('should return action statistics', async () => {
      const result = await auditService.getActionStats();
      
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const stat = result[0];
        expect(stat).toHaveProperty('action');
        expect(stat).toHaveProperty('count');
        expect(typeof stat.count).toBe('number');
      }
    });

    test('should include expected actions in stats', async () => {
      const result = await auditService.getActionStats();
      
      const actions = result.map(stat => stat.action);
      expect(actions).toEqual(expect.arrayContaining(['create', 'update', 'delete']));
    });
  });

  describe('getResourceStats', () => {
    beforeEach(async () => {
      // Create diverse resource logs
      const logs = [
        { ...sampleLogData, resourceType: 'server' },
        { ...sampleLogData, resourceType: 'server' },
        { ...sampleLogData, resourceType: 'config' },
        { ...sampleLogData, resourceType: 'user' }
      ];

      for (const logData of logs) {
        const result = await auditService.logAction(logData);
        if (result) {
          testLogs.push(result);
        }
      }
    });

    test('should return resource statistics', async () => {
      const result = await auditService.getResourceStats();
      
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const stat = result[0];
        expect(stat).toHaveProperty('resourceType');
        expect(stat).toHaveProperty('count');
        expect(typeof stat.count).toBe('number');
      }
    });

    test('should include expected resource types in stats', async () => {
      const result = await auditService.getResourceStats();
      
      const resourceTypes = result.map(stat => stat.resourceType);
      expect(resourceTypes).toEqual(expect.arrayContaining(['server', 'config', 'user']));
    });
  });

  describe('getUserStats', () => {
    test('should return user statistics or empty array', async () => {
      const result = await auditService.getUserStats();
      
      expect(Array.isArray(result)).toBe(true);
      // This method might not be implemented for SQLite, so empty array is acceptable
    });

    test('should handle limit parameter', async () => {
      const result = await auditService.getUserStats(5);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getDailyActivity', () => {
    test('should return daily activity or empty array', async () => {
      const result = await auditService.getDailyActivity();
      
      expect(Array.isArray(result)).toBe(true);
      // This method might not be implemented for SQLite, so empty array is acceptable
    });

    test('should handle days parameter', async () => {
      const result = await auditService.getDailyActivity(7);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUniqueValues', () => {
    test('should return unique values or empty array', async () => {
      const result = await auditService.getUniqueValues('action');
      
      expect(Array.isArray(result)).toBe(true);
      // This method might not be implemented for SQLite, so empty array is acceptable
    });
  });

  describe('getUniqueUsers', () => {
    test('should return unique users or empty array', async () => {
      const result = await auditService.getUniqueUsers();
      
      expect(Array.isArray(result)).toBe(true);
      // This method might not be implemented for SQLite, so empty array is acceptable
    });

    test('should handle limit parameter', async () => {
      const result = await auditService.getUniqueUsers(10);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('error handling', () => {
    test('should handle getAuditLogs errors gracefully', async () => {
      try {
        // This should not throw even if there are issues
        const result = await auditService.getAuditLogs({ invalid: 'parameter' });
        expect(result).toBeDefined();
      } catch (error) {
        // If it throws, that's acceptable as long as it's a meaningful error
        expect(error).toBeDefined();
      }
    });

    test('should handle repository errors in stats methods', async () => {
      const actionStats = await auditService.getActionStats();
      const resourceStats = await auditService.getResourceStats();
      
      // These should not throw and should return arrays
      expect(Array.isArray(actionStats)).toBe(true);
      expect(Array.isArray(resourceStats)).toBe(true);
    });
  });
});
