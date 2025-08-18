const userRepository = require('../../repositories/userRepository');

describe('UserRepository', () => {
  beforeEach(async () => {
    // Clear any existing users
    const users = await userRepository.findAll();
    for (const user of users) {
      await userRepository.findByIdAndDelete(user.id || user._id);
    }
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const user = await userRepository.create(userData);
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
      expect(user.password).toBeUndefined(); // Password should not be returned
    });
  });

  describe('findByUsername', () => {
    it('should find user by username without password', async () => {
      await userRepository.create({
        username: 'finduser',
        password: 'password123'
      });

      const user = await userRepository.findByUsername('finduser');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('finduser');
      expect(user.password).toBeUndefined();
    });

    it('should find user by username with password when requested', async () => {
      await userRepository.create({
        username: 'finduser2',
        password: 'password123'
      });

      const user = await userRepository.findByUsername('finduser2', { includePassword: true });
      
      expect(user).toBeDefined();
      expect(user.username).toBe('finduser2');
      expect(user.password).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const created = await userRepository.create({
        username: 'byiduser',
        password: 'password123'
      });

      const user = await userRepository.findById(created.id || created._id);
      
      expect(user).toBeDefined();
      expect(user.username).toBe('byiduser');
      expect(user.password).toBeUndefined();
    });

    it('should find user by ID with password when requested', async () => {
      const created = await userRepository.create({
        username: 'byiduser2',
        password: 'password123'
      });

      const user = await userRepository.findById(created.id || created._id, { includePassword: true });
      
      expect(user).toBeDefined();
      expect(user.username).toBe('byiduser2');
      expect(user.password).toBeDefined();
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should update user successfully', async () => {
      const created = await userRepository.create({
        username: 'updateuser',
        email: 'old@example.com',
        password: 'password123'
      });

      const updated = await userRepository.findByIdAndUpdate(
        created.id || created._id,
        { email: 'new@example.com' },
        { new: true }
      );
      
      expect(updated).toBeDefined();
      expect(updated.email).toBe('new@example.com');
      expect(updated.username).toBe('updateuser');
    });
  });

  describe('findByIdAndDelete', () => {
    it('should delete user successfully', async () => {
      const created = await userRepository.create({
        username: 'deleteuser',
        password: 'password123'
      });

      const deleted = await userRepository.findByIdAndDelete(created.id || created._id);
      
      expect(deleted).toBeDefined();
      expect(deleted.username).toBe('deleteuser');

      // Verify user is actually deleted
      const found = await userRepository.findById(created.id || created._id);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      await userRepository.create({ username: 'user1', password: 'pass1' });
      await userRepository.create({ username: 'user2', password: 'pass2' });

      const users = await userRepository.findAll();
      
      expect(users).toHaveLength(2);
      expect(users.map(u => u.username)).toContain('user1');
      expect(users.map(u => u.username)).toContain('user2');
    });
  });

  describe('isUsernameExists', () => {
    it('should return true if username exists', async () => {
      await userRepository.create({
        username: 'existsuser',
        password: 'password123'
      });

      const exists = await userRepository.isUsernameExists('existsuser');
      expect(exists).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      const exists = await userRepository.isUsernameExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('isEmailExists', () => {
    it('should return true if email exists', async () => {
      await userRepository.create({
        username: 'emailuser',
        email: 'exists@example.com',
        password: 'password123'
      });

      const exists = await userRepository.isEmailExists('exists@example.com');
      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      const exists = await userRepository.isEmailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('comparePassword', () => {
    it('should correctly compare passwords', async () => {
      const user = await userRepository.create({
        username: 'passuser',
        password: 'password123'
      });

      const userWithPassword = await userRepository.findByUsername('passuser', { includePassword: true });
      
      const isMatch = await userRepository.comparePassword('password123', userWithPassword.password);
      expect(isMatch).toBe(true);

      const isNotMatch = await userRepository.comparePassword('wrongpassword', userWithPassword.password);
      expect(isNotMatch).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', async () => {
      const created = await userRepository.create({
        username: 'loginuser',
        password: 'password123'
      });

      const loginTime = new Date();
      const updated = await userRepository.updateLastLogin(created.id || created._id, loginTime);
      
      expect(updated).toBeDefined();
      expect(updated.lastLogin).toBeDefined();
    });
  });
});
