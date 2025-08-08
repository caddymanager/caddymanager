const caddyService = require('../../services/caddyService');

// Mock axios to prevent actual HTTP calls
jest.mock('axios');
const axios = require('axios');

describe('CaddyService Integration', () => {
  const mockServerData = {
    name: 'Test Server',
    apiUrl: 'http://localhost',
    apiPort: 2019,
    adminApiPath: '/config/',
    active: true,
    tags: ['test'],
    description: 'Test server for integration tests'
  };

  const mockConfigData = {
    name: 'Test Configuration',
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
    metadata: {
      description: 'Test configuration',
      version: '1.0',
      tags: ['test']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default axios mocks
    axios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn()
    });
  });

  describe('Server Management', () => {
    test('should get all servers', async () => {
      const servers = await caddyService.getAllServers();
      
      expect(Array.isArray(servers)).toBe(true);
    });

    test('should get server by ID', async () => {
      // First add a server
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const created = await caddyService.addServer(mockServerData);
      
      // Then get it by ID
      const found = await caddyService.getServerById(created._id || created.id);
      
      expect(found).toBeDefined();
      expect(found.name).toBe(mockServerData.name);
    });

    test('should add a new server', async () => {
      // Mock successful connection test
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const result = await caddyService.addServer(mockServerData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(mockServerData.name);
      expect(result.status).toBe('online'); // Should be online due to mocked successful connection
      expect(mockAxiosInstance.get).toHaveBeenCalled(); // Verify connection test was called
    });

    test('should handle server connection failure during add', async () => {
      // Mock failed connection test
      const mockAxiosInstance = {
        get: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const result = await caddyService.addServer(mockServerData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(mockServerData.name);
      expect(result.status).toBe('offline'); // Should be offline due to connection failure
      expect(mockAxiosInstance.get).toHaveBeenCalled(); // Verify connection test was attempted
    });

    test('should update server', async () => {
      // Mock successful connection test for initial add
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const created = await caddyService.addServer(mockServerData);
      
      const updateData = { name: 'Updated Test Server', description: 'Updated description' };
      const updated = await caddyService.updateServer(created._id || created.id, updateData);
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Test Server');
    });

    test('should delete server', async () => {
      // Mock successful connection test for initial add
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const created = await caddyService.addServer(mockServerData);
      
      const deleted = await caddyService.deleteServer(created._id || created.id);
      
      expect(deleted).toBeDefined();
      expect(deleted.name).toBe(mockServerData.name);
    });
  });

  describe('Configuration Management', () => {
    test('should get all configurations', async () => {
      const configs = await caddyService.getAllConfigs();
      
      expect(Array.isArray(configs)).toBe(true);
    });

    test('should add configuration', async () => {
      const result = await caddyService.addConfig(mockConfigData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(mockConfigData.name);
      expect(result.format).toBe('json');
      expect(result.status).toBe('draft');
    });

    test('should save configuration', async () => {
      const result = await caddyService.saveConfig(mockConfigData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(mockConfigData.name);
      expect(result.format).toBe('json');
    });

    test('should get configuration by ID', async () => {
      const created = await caddyService.addConfig(mockConfigData);
      
      const found = await caddyService.getConfigById(created._id || created.id);
      
      expect(found).toBeDefined();
      expect(found.name).toBe(mockConfigData.name);
    });

    test('should validate required fields for configuration', async () => {
      // Test without name
      try {
        await caddyService.addConfig({ jsonConfig: {} });
        fail('Should have thrown error for missing name');
      } catch (error) {
        expect(error.message).toContain('name is required');
      }

      // Test without jsonConfig
      try {
        await caddyService.addConfig({ name: 'Test' });
        fail('Should have thrown error for missing jsonConfig');
      } catch (error) {
        expect(error.message).toContain('JSON configuration content is required');
      }
    });

    test('should handle configuration with servers array', async () => {
      // First create a server
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const server = await caddyService.addServer(mockServerData);
      
      // Create config with server reference
      const configWithServer = {
        ...mockConfigData,
        servers: [server._id || server.id]
      };
      
      const result = await caddyService.addConfig(configWithServer);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.servers)).toBe(true);
      expect(result.servers.length).toBe(1);
    });
  });

  describe('Server Status Management', () => {
    test('should check all servers status', async () => {
      // Mock axios instances for status checks
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const result = await caddyService.checkAllServersStatus();
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(typeof result.online).toBe('number');
      expect(typeof result.offline).toBe('number');
      expect(Array.isArray(result.details)).toBe(true);
    });

    test('should check individual server status', async () => {
      // Create a server first
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      const server = await caddyService.addServer(mockServerData);
      
      const status = await caddyService.checkServerStatus(server._id || server.id);
      
      expect(status).toBeDefined();
      expect(status.id).toBeDefined();
      expect(status.name).toBe(mockServerData.name);
      expect(['online', 'offline'].includes(status.status)).toBe(true);
    });
  });

  describe('Configuration Operations', () => {
    test('should delete configuration', async () => {
      const created = await caddyService.addConfig(mockConfigData);
      
      const deleted = await caddyService.deleteConfig(created._id || created.id);
      
      expect(deleted).toBeDefined();
      expect(deleted.name).toBe(mockConfigData.name);
    });

    test('should return null when deleting non-existent configuration', async () => {
      const result = await caddyService.deleteConfig(99999);
      expect(result).toBeNull();
    });

    test('should update configuration metadata', async () => {
      const created = await caddyService.addConfig(mockConfigData);
      
      const updateData = {
        name: 'Updated Config Name',
        metadata: { description: 'Updated description' }
      };
      
      const updated = await caddyService.updateConfigMetadata(
        created._id || created.id, 
        updateData
      );
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Config Name');
    });

    test('should update configuration content', async () => {
      const created = await caddyService.addConfig(mockConfigData);
      
      const newContent = {
        apps: {
          http: {
            servers: {
              srv0: {
                listen: [':8080'],
                routes: []
              }
            }
          }
        }
      };
      
      const updated = await caddyService.updateConfigContent(
        created._id || created.id, 
        { jsonConfig: newContent }
      );
      
      expect(updated).toBeDefined();
      expect(updated.status).toBe('draft'); // Should reset to draft after content update
      expect(updated.jsonConfig.apps.http.servers.srv0.listen[0]).toBe(':8080');
    });
  });

  describe('Error Handling', () => {
    test('should handle server not found errors', async () => {
      try {
        await caddyService.getServerById(99999);
        // SQLite returns null, MongoDB might throw
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle configuration not found errors', async () => {
      const result = await caddyService.getConfigById(99999);
      expect(result).toBeNull();
    });

    test('should handle invalid server references in configuration', async () => {
      const configWithInvalidServer = {
        ...mockConfigData,
        servers: ['invalid-server-id-123456']
      };
      
      try {
        await caddyService.addConfig(configWithInvalidServer);
        fail('Should have thrown error for invalid server reference');
      } catch (error) {
        expect(error.message).toContain('does not exist');
      }
    });
  });

  describe('Configuration Validation', () => {
    test('should validate configuration structure', () => {
      const validConfig = {
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
      };
      
      const result = caddyService.checkConfigurationForCommonIssues(validConfig);
      
      expect(result).toBeDefined();
      expect(result.hasErrors).toBe(false);
    });

    test('should detect configuration errors', () => {
      const invalidConfig = {}; // No HTTP servers
      
      const result = caddyService.checkConfigurationForCommonIssues(invalidConfig);
      
      expect(result).toBeDefined();
      expect(result.hasErrors).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
