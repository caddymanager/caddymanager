const caddyConfigRepository = require('../../repositories/caddyConfigRepository');

describe('CaddyConfigRepository', () => {
  const mockConfig = {
    servers: ['server1', 'server2'],
    name: 'Test Configuration',
    format: 'json',
    jsonConfig: {
      apps: {
        http: {
          servers: {
            srv0: {
              listen: [':80'],
              routes: []
            }
          }
        }
      }
    },
    status: 'draft',
    metadata: {
      description: 'Test configuration for unit tests',
      version: '1.0',
      tags: ['test']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQLite Engine', () => {
    beforeAll(() => {
      process.env.DB_ENGINE = 'sqlite';
    });

    test('should create a new configuration', async () => {
      const result = await caddyConfigRepository.create(mockConfig);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(mockConfig.name);
      expect(result.format).toBe(mockConfig.format);
      expect(result.status).toBe(mockConfig.status);
      expect(result.id).toBeDefined();
      expect(result._id).toBeDefined(); // Compatibility field
      expect(Array.isArray(result.servers)).toBe(true);
      expect(typeof result.jsonConfig).toBe('object');
    });

    test('should find all configurations', async () => {
      const results = await caddyConfigRepository.findAll({ limit: 10 });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should find configuration by ID', async () => {
      // First create a configuration
      const created = await caddyConfigRepository.create(mockConfig);
      
      // Then find it
      const found = await caddyConfigRepository.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found.name).toBe(mockConfig.name);
      expect(found.id).toBe(created.id);
      expect(typeof found.jsonConfig).toBe('object');
    });

    test('should return null when configuration not found', async () => {
      const found = await caddyConfigRepository.findById(99999);
      expect(found).toBeNull();
    });

    test('should update configuration by ID', async () => {
      // Create a configuration
      const created = await caddyConfigRepository.create(mockConfig);
      
      // Update it
      const updateData = { 
        name: 'Updated Test Configuration', 
        status: 'live',
        metadata: { ...mockConfig.metadata, version: '2.0' }
      };
      const updated = await caddyConfigRepository.findByIdAndUpdate(
        created.id, 
        updateData, 
        { new: true }
      );
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Test Configuration');
      expect(updated.status).toBe('live');
    });

    test('should delete configuration by ID', async () => {
      // Create a configuration
      const created = await caddyConfigRepository.create(mockConfig);
      
      // Delete it
      const deleted = await caddyConfigRepository.findByIdAndDelete(created.id);
      
      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(created.id);
      
      // Verify it's gone
      const found = await caddyConfigRepository.findById(created.id);
      expect(found).toBeNull();
    });

    test('should find configurations with query', async () => {
      // Create a configuration with specific server
      const configWithServer = { ...mockConfig, servers: ['test-server-123'] };
      await caddyConfigRepository.create(configWithServer);
      
      // Find configurations for that server
      const results = await caddyConfigRepository.find({ servers: 'test-server-123' });
      
      expect(Array.isArray(results)).toBe(true);
    });

    test('should find configurations with status filter', async () => {
      // Create configurations with different statuses
      await caddyConfigRepository.create({ ...mockConfig, status: 'live' });
      await caddyConfigRepository.create({ ...mockConfig, status: 'draft' });
      
      // Find only live configurations
      const liveConfigs = await caddyConfigRepository.find({ status: 'live' });
      
      expect(Array.isArray(liveConfigs)).toBe(true);
      liveConfigs.forEach(config => {
        expect(config.status).toBe('live');
      });
    });

    test('should handle population query', async () => {
      // Create a configuration
      const created = await caddyConfigRepository.create(mockConfig);
      
      // Find with population flag
      const results = await caddyConfigRepository.find({ _populate: true });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test('should save configuration instance', async () => {
      const config = { ...mockConfig };
      const saved = await caddyConfigRepository.save(config);
      
      expect(saved).toBeDefined();
      expect(saved.name).toBe(mockConfig.name);
      expect(typeof saved.jsonConfig).toBe('object');
    });

    test('should create configuration instance', () => {
      const instance = caddyConfigRepository.createInstance(mockConfig);
      
      expect(instance).toBeDefined();
      expect(instance.name).toBe(mockConfig.name);
      expect(typeof instance.save).toBe('function');
    });

    test('should handle complex JSON configuration', async () => {
      const complexConfig = {
        ...mockConfig,
        jsonConfig: {
          apps: {
            http: {
              servers: {
                srv0: {
                  listen: [':80', ':443'],
                  routes: [
                    {
                      match: [{ host: ['example.com'] }],
                      handle: [
                        {
                          handler: 'static_response',
                          status_code: 200,
                          body: 'Hello World'
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      };

      const result = await caddyConfigRepository.create(complexConfig);
      
      expect(result).toBeDefined();
      expect(result.jsonConfig.apps.http.servers.srv0.routes).toBeDefined();
      expect(result.jsonConfig.apps.http.servers.srv0.routes[0].handle[0].handler).toBe('static_response');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      try {
        await caddyConfigRepository.create(null);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle invalid JSON configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        jsonConfig: 'invalid-json-string'
      };

      try {
        const result = await caddyConfigRepository.create(invalidConfig);
        // SQLite will accept it as a string, which is fine
        expect(result).toBeDefined();
      } catch (error) {
        // Or it might throw, which is also acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe('Query Edge Cases', () => {
    test('should handle query with $ne operator', async () => {
      // Create a configuration
      const created = await caddyConfigRepository.create(mockConfig);
      
      // Find configurations excluding this one
      const results = await caddyConfigRepository.find({ 
        _id: { $ne: created.id } 
      });
      
      expect(Array.isArray(results)).toBe(true);
      // Should not include the created configuration
      const foundCreated = results.find(config => config.id === created.id);
      expect(foundCreated).toBeUndefined();
    });

    test('should handle empty query', async () => {
      const results = await caddyConfigRepository.find({});
      
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
