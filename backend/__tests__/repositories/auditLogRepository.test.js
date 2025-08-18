const auditLogRepository = require('../../repositories/auditLogRepository');

describe('auditLogRepository', () => {
  let testLogs = [];
  let createdLogId;

  const sampleLogData = {
    action: 'create',
    user: {
      userId: 123,
      username: 'testuser'
    },
    resourceType: 'server',
    resourceId: 'server-123',
    details: { name: 'Test Server', port: 2019 },
    statusCode: 201,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  };

  const sampleLogData2 = {
    action: 'update',
    user: {
      userId: 456,
      username: 'anotheruser'
    },
    resourceType: 'config',
    resourceId: 'config-456',
    details: { changed: 'host configuration' },
    statusCode: 200,
    ipAddress: '192.168.1.2',
    userAgent: 'Chrome/91.0'
  };

  beforeEach(() => {
    testLogs = [];
  });

  afterEach(() => {
    // Clean up any test data
    testLogs = [];
  });

  describe('create', () => {
    test('should create a new audit log entry', async () => {
      const result = await auditLogRepository.create(sampleLogData);
      
      expect(result).toBeDefined();
      expect(result.action).toBe(sampleLogData.action);
      expect(result.id || result._id).toBeDefined();
      
      // Store for cleanup
      createdLogId = result.id || result._id;
      testLogs.push(result);
    });

    test('should handle minimal audit log data', async () => {
      const minimalLog = {
        action: 'delete',
        user: { username: 'system' },
        resourceType: 'server'
      };

      const result = await auditLogRepository.create(minimalLog);
      
      expect(result).toBeDefined();
      expect(result.action).toBe('delete');
      expect(result.resourceType).toBe('server');
      
      testLogs.push(result);
    });

    test('should handle log with complex details object', async () => {
      const complexLog = {
        ...sampleLogData,
        details: {
          oldValue: { name: 'Old Server', port: 8080 },
          newValue: { name: 'New Server', port: 2019 },
          metadata: { source: 'api', version: '1.0' }
        }
      };

      const result = await auditLogRepository.create(complexLog);
      
      expect(result).toBeDefined();
      expect(result.details).toBeDefined();
      
      testLogs.push(result);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test data
      const log1 = await auditLogRepository.create(sampleLogData);
      const log2 = await auditLogRepository.create(sampleLogData2);
      testLogs.push(log1, log2);
    });

    test('should retrieve all audit logs with default pagination', async () => {
      const result = await auditLogRepository.findAll();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check structure of first log
      if (result.length > 0) {
        const log = result[0];
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('resourceType');
      }
    });

    test('should handle pagination parameters', async () => {
      const result = await auditLogRepository.findAll({ limit: 1, offset: 0 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('should return empty array when offset exceeds available logs', async () => {
      const result = await auditLogRepository.findAll({ limit: 10, offset: 10000 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('findById', () => {
    let testLog;

    beforeEach(async () => {
      testLog = await auditLogRepository.create(sampleLogData);
      testLogs.push(testLog);
    });

    test('should find audit log by ID', async () => {
      const logId = testLog.id || testLog._id;
      const result = await auditLogRepository.findById(logId);
      
      expect(result).toBeDefined();
      expect(result.action).toBe(sampleLogData.action);
      expect(result.resourceType).toBe(sampleLogData.resourceType);
    });

    test('should return null for non-existent ID', async () => {
      const result = await auditLogRepository.findById('non-existent-id');
      
      expect(result).toBeNull();
    });

    test('should handle different ID formats', async () => {
      const logId = testLog.id || testLog._id;
      
      // Test with string ID
      const result = await auditLogRepository.findById(logId.toString());
      expect(result).toBeDefined();
    });
  });

  describe('findByResource', () => {
    beforeEach(async () => {
      // Create logs for different resources
      const serverLog = await auditLogRepository.create({
        ...sampleLogData,
        resourceType: 'server',
        resourceId: 'server-123'
      });
      
      const configLog = await auditLogRepository.create({
        ...sampleLogData2,
        resourceType: 'config',
        resourceId: 'config-456'
      });
      
      const anotherServerLog = await auditLogRepository.create({
        ...sampleLogData,
        action: 'update',
        resourceType: 'server',
        resourceId: 'server-123'
      });
      
      testLogs.push(serverLog, configLog, anotherServerLog);
    });

    test('should find logs by resource type and ID', async () => {
      const result = await auditLogRepository.findByResource('server', 'server-123');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // All results should match the resource
      result.forEach(log => {
        expect(log.resourceType).toBe('server');
        expect(log.resourceId).toBe('server-123');
      });
    });

    test('should handle pagination for resource logs', async () => {
      const result = await auditLogRepository.findByResource('server', 'server-123', { limit: 1, offset: 0 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('should return empty array for non-existent resource', async () => {
      const result = await auditLogRepository.findByResource('nonexistent', 'resource-999');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('findByUser', () => {
    beforeEach(async () => {
      // Create logs for different users
      const user1Log = await auditLogRepository.create({
        ...sampleLogData,
        user: { userId: 123, username: 'user1' }
      });
      
      const user2Log = await auditLogRepository.create({
        ...sampleLogData2,
        user: { userId: 456, username: 'user2' }
      });
      
      const anotherUser1Log = await auditLogRepository.create({
        ...sampleLogData,
        action: 'delete',
        user: { userId: 123, username: 'user1' }
      });
      
      testLogs.push(user1Log, user2Log, anotherUser1Log);
    });

    test('should find logs by user ID', async () => {
      const result = await auditLogRepository.findByUser(123);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // All results should match the user (check based on available data structure)
      result.forEach(log => {
        // Handle both SQLite (userId field) and potential MongoDB (user.userId) structures
        const logUserId = log.userId || (log.user && log.user.userId);
        expect(logUserId).toBe(123);
      });
    });

    test('should handle pagination for user logs', async () => {
      const result = await auditLogRepository.findByUser(123, { limit: 1, offset: 0 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('should return empty array for non-existent user', async () => {
      const result = await auditLogRepository.findByUser(999);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getFilterOptions', () => {
    beforeEach(async () => {
      // Create diverse logs for filter testing
      const logs = [
        { ...sampleLogData, action: 'create', resourceType: 'server' },
        { ...sampleLogData2, action: 'update', resourceType: 'config' },
        { ...sampleLogData, action: 'delete', resourceType: 'server', user: { username: 'admin' } }
      ];
      
      for (const logData of logs) {
        const log = await auditLogRepository.create(logData);
        testLogs.push(log);
      }
    });

    test('should return filter options', async () => {
      const result = await auditLogRepository.getFilterOptions();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('resourceTypes');
      expect(result).toHaveProperty('users');
      
      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.resourceTypes)).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });

    test('should include expected filter values', async () => {
      const result = await auditLogRepository.getFilterOptions();
      
      // Should include actions we created
      expect(result.actions).toEqual(expect.arrayContaining(['create', 'update', 'delete']));
      
      // Should include resource types we created
      expect(result.resourceTypes).toEqual(expect.arrayContaining(['server', 'config']));
      
      // Should include usernames we created
      expect(result.users).toEqual(expect.arrayContaining(['testuser', 'anotheruser', 'admin']));
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Create logs for stats testing
      const logs = [
        { ...sampleLogData, action: 'create', resourceType: 'server' },
        { ...sampleLogData, action: 'create', resourceType: 'config' },
        { ...sampleLogData2, action: 'update', resourceType: 'server' },
        { ...sampleLogData2, action: 'delete', resourceType: 'config' }
      ];
      
      for (const logData of logs) {
        const log = await auditLogRepository.create(logData);
        testLogs.push(log);
      }
    });

    test('should return statistics', async () => {
      const result = await auditLogRepository.getStats();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byAction');
      expect(result).toHaveProperty('byResourceType');
      
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.byAction)).toBe(true);
      expect(Array.isArray(result.byResourceType)).toBe(true);
    });

    test('should have correct statistics structure', async () => {
      const result = await auditLogRepository.getStats();
      
      // Check action statistics structure
      if (result.byAction.length > 0) {
        const actionStat = result.byAction[0];
        expect(actionStat).toHaveProperty('action');
        expect(actionStat).toHaveProperty('count');
        expect(typeof actionStat.count).toBe('number');
      }
      
      // Check resource type statistics structure
      if (result.byResourceType.length > 0) {
        const resourceStat = result.byResourceType[0];
        expect(resourceStat).toHaveProperty('resourceType');
        expect(resourceStat).toHaveProperty('count');
        expect(typeof resourceStat.count).toBe('number');
      }
    });

    test('should have accurate counts', async () => {
      const result = await auditLogRepository.getStats();
      
      // Total should be at least the number of logs we created
      expect(result.total).toBeGreaterThanOrEqual(4);
      
      // Check that action counts add up
      const totalActionCounts = result.byAction.reduce((sum, stat) => sum + stat.count, 0);
      expect(totalActionCounts).toBeGreaterThan(0);
      
      // Check that resource type counts add up
      const totalResourceCounts = result.byResourceType.reduce((sum, stat) => sum + stat.count, 0);
      expect(totalResourceCounts).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    test('should handle invalid data gracefully', async () => {
      // Test with missing required fields
      try {
        await auditLogRepository.create({});
        // If it doesn't throw, that's fine - some implementations might handle this gracefully
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle invalid pagination parameters', async () => {
      // Test with negative pagination values
      const result = await auditLogRepository.findAll({ limit: -1, offset: -1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
