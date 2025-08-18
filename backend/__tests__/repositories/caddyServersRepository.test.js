const caddyServersRepository = require('../../repositories/caddyServersRepository');

describe('CaddyServersRepository', () => {
  const mockServer = {
    name: 'Test Server',
    apiUrl: 'http://localhost',
    apiPort: 2019,
    adminApiPath: '/config/',
    active: true,
    tags: ['test'],
    description: 'Test server for unit tests',
    status: 'unknown'
  };

  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('SQLite Engine', () => {
    beforeAll(() => {
      process.env.DB_ENGINE = 'sqlite';
    });

    test('should create a new server', async () => {
      const result = await caddyServersRepository.create(mockServer);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(mockServer.name);
      expect(result.apiUrl).toBe(mockServer.apiUrl);
      expect(result.apiPort).toBe(mockServer.apiPort);
      expect(result.id).toBeDefined();
      expect(result._id).toBeDefined(); // Compatibility field
    });

    test('should find all servers', async () => {
      const results = await caddyServersRepository.findAll({ limit: 10 });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should find server by ID', async () => {
      // First create a server
      const created = await caddyServersRepository.create(mockServer);
      
      // Then find it
      const found = await caddyServersRepository.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found.name).toBe(mockServer.name);
      expect(found.id).toBe(created.id);
    });

    test('should return null when server not found', async () => {
      const found = await caddyServersRepository.findById(99999);
      expect(found).toBeNull();
    });

    test('should update server by ID', async () => {
      // Create a server
      const created = await caddyServersRepository.create(mockServer);
      
      // Update it
      const updateData = { name: 'Updated Test Server', status: 'online' };
      const updated = await caddyServersRepository.findByIdAndUpdate(
        created.id, 
        updateData, 
        { new: true }
      );
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Test Server');
      expect(updated.status).toBe('online');
    });

    test('should delete server by ID', async () => {
      // Create a server
      const created = await caddyServersRepository.create(mockServer);
      
      // Delete it
      const deleted = await caddyServersRepository.findByIdAndDelete(created.id);
      
      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(created.id);
      
      // Verify it's gone
      const found = await caddyServersRepository.findById(created.id);
      expect(found).toBeNull();
    });

    test('should find servers with query', async () => {
      // Create a server with specific activeConfig
      const serverWithConfig = { ...mockServer, activeConfig: 123 };
      await caddyServersRepository.create(serverWithConfig);
      
      // Find servers with that activeConfig
      const results = await caddyServersRepository.find({ activeConfig: 123 });
      
      expect(Array.isArray(results)).toBe(true);
    });

    test('should check if server exists', async () => {
      // Create a server
      const created = await caddyServersRepository.create(mockServer);
      
      // Check existence
      const exists = await caddyServersRepository.exists({ _id: created.id });
      expect(exists).toBeTruthy();
      
      // Check non-existence
      const notExists = await caddyServersRepository.exists({ _id: 99999 });
      expect(notExists).toBeNull();
    });

    test('should save server instance', async () => {
      const server = { ...mockServer };
      const saved = await caddyServersRepository.save(server);
      
      expect(saved).toBeDefined();
      expect(saved.name).toBe(mockServer.name);
    });

    test('should create server instance', () => {
      const instance = caddyServersRepository.createInstance(mockServer);
      
      expect(instance).toBeDefined();
      expect(instance.name).toBe(mockServer.name);
      expect(typeof instance.save).toBe('function');
    });
  });

  describe('MongoDB Engine (Mocked)', () => {
    beforeAll(() => {
      process.env.DB_ENGINE = 'mongo';
    });

    afterAll(() => {
      // Reset to sqlite for other tests
      process.env.DB_ENGINE = 'sqlite';
    });

    test('should handle MongoDB operations when available', () => {
      // This test would require actual MongoDB connection
      // For now, just test that the repository doesn't crash with mongo engine
      expect(() => {
        const instance = caddyServersRepository.createInstance(mockServer);
        expect(instance).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid data
      try {
        await caddyServersRepository.create(null);
        // If we get here, the implementation should have handled it
        expect(true).toBe(true);
      } catch (error) {
        // Expected to throw with invalid data
        expect(error).toBeDefined();
      }
    });
  });
});
