const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const userRepository = require('../../repositories/userRepository');

// Mock the ping service to avoid actual health checks
jest.mock('../../services/pingService', () => ({
  getPingServiceStatus: jest.fn().mockReturnValue({ running: true }),
  startPingService: jest.fn(),
  stopPingService: jest.fn()
}));

// Mock audit service to avoid database operations
jest.mock('../../services/auditService', () => ({
  logAction: jest.fn().mockResolvedValue()
}));

describe('AuthController', () => {
  let testUser, adminUser, authToken, adminToken;

  beforeEach(async () => {
    // Clear users before each test
    const users = await userRepository.findAll();
    for (const user of users) {
      await userRepository.findByIdAndDelete(user.id || user._id);
    }

    // Create test users
    testUser = await userRepository.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });

    adminUser = await userRepository.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

    // Generate tokens
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_for_development';
    authToken = jwt.sign({ id: testUser.id || testUser._id }, JWT_SECRET, { expiresIn: '24h' });
    adminToken = jwt.sign({ id: adminUser.id || adminUser._id }, JWT_SECRET, { expiresIn: '24h' });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should fail login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update user profile successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/update-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'updateduser',
          email: 'updated@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('updateduser');
      expect(response.body.user.email).toBe('updated@example.com');
    });

    it('should fail with duplicate username', async () => {
      const response = await request(app)
        .put('/api/v1/auth/update-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'adminuser' // Already exists
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username already exists');
    });
  });

  describe('PUT /auth/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should fail with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });
  });

  describe('Admin Routes', () => {
    describe('GET /auth/users', () => {
      it('should get all users for admin', async () => {
        const response = await request(app)
          .get('/api/v1/auth/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.users).toHaveLength(2);
      });

      it('should fail for non-admin user', async () => {
        const response = await request(app)
          .get('/api/v1/auth/users')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /auth/users', () => {
      it('should create user as admin', async () => {
        const response = await request(app)
          .post('/api/v1/auth/create-user')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'newuser',
            email: 'new@example.com',
            password: 'password123',
            role: 'user'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user.username).toBe('newuser');
      });

      it('should fail with duplicate username', async () => {
        const response = await request(app)
          .post('/api/v1/auth/create-user')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'testuser', // Already exists
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Username already exists');
      });
    });

    describe('PUT /auth/users/role', () => {
      it('should update user role as admin', async () => {
        const response = await request(app)
          .put('/api/v1/auth/update-user-role')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: testUser.id || testUser._id,
            role: 'admin'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.role).toBe('admin');
      });

      it('should fail with invalid role', async () => {
        const response = await request(app)
          .put('/api/v1/auth/update-user-role')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: testUser.id || testUser._id,
            role: 'invalidrole'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid role');
      });
    });

    describe('DELETE /auth/users/:userId', () => {
      it('should delete user as admin', async () => {
        const response = await request(app)
          .delete(`/api/v1/auth/delete-user/${testUser.id || testUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User deleted successfully');
      });

      it('should not allow admin to delete themselves', async () => {
        const response = await request(app)
          .delete(`/api/v1/auth/delete-user/${adminUser.id || adminUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Cannot delete your own account');
      });
    });
  });
});
