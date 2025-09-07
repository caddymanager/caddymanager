const request = require('supertest');
const express = require('express');

// Mock all the dependencies at the top level before any imports
jest.mock('../../services/caddyService', () => ({
  getAllServers: jest.fn(),
  getServerById: jest.fn(),
  addServer: jest.fn(),
  updateServer: jest.fn(),
  deleteServer: jest.fn(),
  testServerConnection: jest.fn(),
  checkServerStatus: jest.fn(),
  checkAllServersStatus: jest.fn(),
}));

jest.mock('../../repositories/caddyServersRepository', () => ({
  findById: jest.fn(),
}));

jest.mock('../../services/auditService', () => ({
  logAction: jest.fn(),
}));

const caddyController = require('../../controllers/caddyController');
const caddyService = require('../../services/caddyService');
const caddyServersRepository = require('../../repositories/caddyServersRepository');
const auditService = require('../../services/auditService');

describe('CaddyController', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock middleware for req.user
    app.use((req, res, next) => {
      req.user = { id: 'test-user-id', username: 'testuser' };
      req.ip = '127.0.0.1';
      next();
    });

    // Set up routes
    app.get('/servers', caddyController.getAllServers);
    app.get('/servers/:id', caddyController.getServerById);
    app.post('/servers', caddyController.addServer);
    app.put('/servers/:id', caddyController.updateServer);
    app.delete('/servers/:id', caddyController.deleteServer);
    app.get('/servers/:id/status', caddyController.checkServerStatus);
    app.get('/status/all', caddyController.checkAllServersStatus);

    jest.clearAllMocks();
  });

  describe('getAllServers', () => {
    it('should return all servers successfully', async () => {
      const mockServers = [
        { id: '1', name: 'Server 1', apiUrl: 'http://localhost', apiPort: 2019 },
        { id: '2', name: 'Server 2', apiUrl: 'http://localhost', apiPort: 2020 }
      ];

      caddyService.getAllServers.mockResolvedValue(mockServers);

      const response = await request(app)
        .get('/servers')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        count: 2,
        data: mockServers
      });

      expect(caddyService.getAllServers).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      caddyService.getAllServers.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/servers')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Error fetching Caddy servers',
        error: 'Database error'
      });
    });
  });

  describe('getServerById', () => {
    it('should return server by ID successfully', async () => {
      const mockServer = { id: '1', name: 'Test Server', apiUrl: 'http://localhost', apiPort: 2019 };

      caddyService.getServerById.mockResolvedValue(mockServer);

      const response = await request(app)
        .get('/servers/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockServer
      });

      expect(caddyService.getServerById).toHaveBeenCalledWith('1');
    });

    it('should return 404 for non-existent server', async () => {
      caddyService.getServerById.mockResolvedValue(null);

      const response = await request(app)
        .get('/servers/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Caddy server not found'
      });
    });
  });

  describe('addServer', () => {
    it('should add server successfully', async () => {
      const serverData = {
        name: 'New Server',
        apiUrl: 'http://localhost',
        apiPort: 2019,
        adminApiPath: '/config/'
      };

      const mockCreatedServer = { _id: 'new-server-id', ...serverData };

      caddyService.addServer.mockResolvedValue(mockCreatedServer);
      auditService.logAction.mockResolvedValue({});

      const response = await request(app)
        .post('/servers')
        .send(serverData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Caddy server added successfully',
        data: mockCreatedServer
      });

      expect(caddyService.addServer).toHaveBeenCalledWith(serverData);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'add_server',
          user: expect.any(Object),
          resourceType: 'server',
          resourceId: 'new-server-id'
        })
      );
    });

    it('should handle connection test failure for pullExistingConfig', async () => {
      const serverData = {
        name: 'New Server',
        apiUrl: 'http://localhost',
        apiPort: 2019,
        pullExistingConfig: true
      };

      caddyService.testServerConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .post('/servers')
        .send(serverData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to connect to Caddy server',
        error: 'Connection failed'
      });

      expect(caddyService.testServerConnection).toHaveBeenCalled();
      expect(caddyService.addServer).not.toHaveBeenCalled();
    });
  });

  describe('updateServer', () => {
    it('should update server successfully', async () => {
      const updateData = { name: 'Updated Server Name' };
      const mockUpdatedServer = { _id: 'server-id', name: 'Updated Server Name' };

      caddyService.updateServer.mockResolvedValue(mockUpdatedServer);
      auditService.logAction.mockResolvedValue({});

      const response = await request(app)
        .put('/servers/server-id')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Caddy server updated successfully',
        data: mockUpdatedServer
      });

      expect(caddyService.updateServer).toHaveBeenCalledWith('server-id', updateData);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update_server',
          resourceType: 'server',
          resourceId: 'server-id'
        })
      );
    });

    it('should return 404 for non-existent server', async () => {
      caddyService.updateServer.mockResolvedValue(null);

      const response = await request(app)
        .put('/servers/999')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Caddy server not found'
      });
    });
  });

  describe('deleteServer', () => {
    it('should delete server successfully', async () => {
      const mockDeletedServer = { _id: 'server-id', name: 'Deleted Server', apiUrl: 'http://localhost' };

      caddyService.deleteServer.mockResolvedValue(mockDeletedServer);
      auditService.logAction.mockResolvedValue({});

      const response = await request(app)
        .delete('/servers/server-id')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Caddy server deleted successfully',
        data: mockDeletedServer
      });

      expect(caddyService.deleteServer).toHaveBeenCalledWith('server-id');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete_server',
          resourceType: 'server',
          resourceId: 'server-id'
        })
      );
    });

    it('should return 404 for non-existent server', async () => {
      caddyService.deleteServer.mockResolvedValue(null);

      const response = await request(app)
        .delete('/servers/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Caddy server not found'
      });
    });
  });

  describe('checkServerStatus', () => {
    it('should check server status successfully', async () => {
      const statusResult = {
        status: 'online',
        lastPinged: new Date(),
        id: 'server-id'
      };

      const serverData = {
        id: 'server-id',
        name: 'Test Server',
        apiUrl: 'http://localhost',
        apiPort: 2019,
        lastPinged: new Date()
      };

      caddyService.checkServerStatus.mockResolvedValue(statusResult);
      caddyServersRepository.findById.mockResolvedValue(serverData);

      const response = await request(app)
        .get('/servers/server-id/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Server status checked successfully',
        data: {
          serverId: 'server-id',
          connectionInfo: {
            status: 'online',
            lastChecked: statusResult.lastPinged.toISOString(),
            error: undefined
          },
          serverData: {
            ...serverData,
            lastPinged: serverData.lastPinged.toISOString()
          }
        }
      });

      expect(caddyService.checkServerStatus).toHaveBeenCalledWith('server-id');
      expect(caddyServersRepository.findById).toHaveBeenCalledWith('server-id');
    });

    it('should return 404 when server not found', async () => {
      const statusResult = { status: 'online', lastPinged: new Date() };

      caddyService.checkServerStatus.mockResolvedValue(statusResult);
      caddyServersRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/servers/999/status')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Server not found'
      });
    });
  });

  describe('checkAllServersStatus', () => {
    it('should check all servers status successfully', async () => {
      const statusResults = {
        total: 2,
        online: 1,
        offline: 1,
        details: [
          { id: 'server-1', name: 'Server 1', status: 'online' },
          { id: 'server-2', name: 'Server 2', status: 'offline' }
        ]
      };

      const serverData1 = {
        id: 'server-1',
        name: 'Server 1',
        lastPinged: new Date(),
        updatedAt: new Date(),
        active: true
      };

      const serverData2 = {
        id: 'server-2',
        name: 'Server 2',
        lastPinged: new Date(),
        updatedAt: new Date(),
        active: false
      };

      caddyService.checkAllServersStatus.mockResolvedValue(statusResults);
      caddyServersRepository.findById
        .mockResolvedValueOnce(serverData1)
        .mockResolvedValueOnce(serverData2);

      const response = await request(app)
        .get('/status/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Status check completed successfully');
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.details).toHaveLength(2);

      // Check that server data was enhanced
      expect(response.body.data.details[0]).toEqual({
        id: 'server-1',
        name: 'Server 1',
        status: 'online',
        lastPinged: serverData1.lastPinged.toISOString(),
        updatedAt: serverData1.updatedAt.toISOString(),
        active: true
      });

      expect(caddyService.checkAllServersStatus).toHaveBeenCalledTimes(1);
      expect(caddyServersRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('should handle servers that are not found in database', async () => {
      const statusResults = {
        total: 1,
        online: 1,
        offline: 0,
        details: [
          { id: 'non-existent-server', name: 'Ghost Server', status: 'online' }
        ]
      };

      caddyService.checkAllServersStatus.mockResolvedValue(statusResults);
      caddyServersRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/status/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.details[0]).toEqual({
        id: 'non-existent-server',
        name: 'Ghost Server',
        status: 'online'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      caddyService.getAllServers.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/servers')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Error fetching Caddy servers',
        error: 'Service unavailable'
      });
    });

    it('should handle repository errors in status check', async () => {
      const statusResult = { status: 'online', lastPinged: new Date() };

      caddyService.checkServerStatus.mockResolvedValue(statusResult);
      caddyServersRepository.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/servers/server-id/status')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Error checking server status',
        error: 'Database error'
      });
    });
  });
});
