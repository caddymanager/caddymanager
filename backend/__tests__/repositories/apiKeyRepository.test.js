const apiKeyRepository = require('../../repositories/apiKeyRepository');
const ApiKeyModel = require('../../models/apiKey');

// Mock the API Key model
jest.mock('../../models/apiKey', () => ({
  createApiKey: jest.fn(),
  validateApiKey: jest.fn(),
  find: jest.fn(),
  findAll: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findAllWithUsers: jest.fn()
}));

describe('ApiKeyRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create an API key successfully', async () => {
      const mockApiKey = {
        id: 1,
        name: 'Test Key',
        key: 'test-key-123',
        userId: 1,
        permissions: { read: true },
        createdAt: new Date()
      };

      ApiKeyModel.createApiKey.mockResolvedValue(mockApiKey);

      const result = await apiKeyRepository.createApiKey(1, 'Test Key', { read: true });

      expect(ApiKeyModel.createApiKey).toHaveBeenCalledWith(1, 'Test Key', { read: true }, null);
      expect(result).toEqual(mockApiKey);
    });

    it('should throw error if createApiKey not implemented', async () => {
      delete ApiKeyModel.createApiKey;

      await expect(apiKeyRepository.createApiKey(1, 'Test Key'))
        .rejects.toThrow('ApiKeyModel.createApiKey not implemented');
    });
  });

  describe('validateApiKey', () => {
    it('should validate an API key successfully', async () => {
      const mockResult = { valid: true, userId: 1 };
      ApiKeyModel.validateApiKey.mockResolvedValue(mockResult);

      const result = await apiKeyRepository.validateApiKey('test-key');

      expect(ApiKeyModel.validateApiKey).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(mockResult);
    });

    it('should throw error if validateApiKey not implemented', async () => {
      delete ApiKeyModel.validateApiKey;

      await expect(apiKeyRepository.validateApiKey('test-key'))
        .rejects.toThrow('ApiKeyModel.validateApiKey not implemented');
    });
  });

  describe('findAll', () => {
    it('should find all API keys using Mongoose-style', async () => {
      const mockApiKeys = [{ id: 1, name: 'Key 1' }, { id: 2, name: 'Key 2' }];
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockApiKeys)
      };
      ApiKeyModel.find.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findAll({ userId: 1 });

      expect(ApiKeyModel.find).toHaveBeenCalledWith({ userId: 1 });
      expect(mockChain.select).toHaveBeenCalledWith('-key');
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockApiKeys);
    });

    it('should find all API keys using SQLite-style', async () => {
      // Temporarily remove find method to simulate SQLite
      const originalFind = ApiKeyModel.find;
      ApiKeyModel.find = undefined;
      
      const mockApiKeys = [{ id: 1, name: 'Key 1' }];
      ApiKeyModel.findAll.mockResolvedValue(mockApiKeys);

      const result = await apiKeyRepository.findAll({ userId: 1 });

      expect(ApiKeyModel.findAll).toHaveBeenCalledWith({ userId: 1 });
      expect(result).toEqual(mockApiKeys);
      
      // Restore the original method
      ApiKeyModel.find = originalFind;
    });
  });

  describe('findByUserId', () => {
    it('should find API keys by user ID using Mongoose-style', async () => {
      const mockApiKeys = [{ id: 1, name: 'Key 1' }];
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockApiKeys)
      };
      ApiKeyModel.find.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findByUserId(1);

      expect(ApiKeyModel.find).toHaveBeenCalledWith({ userId: 1 });
      expect(result).toEqual(mockApiKeys);
    });

    it('should find API keys by user ID using SQLite-style', async () => {
      // Temporarily remove find method to simulate SQLite
      const originalFind = ApiKeyModel.find;
      ApiKeyModel.find = undefined;
      
      const mockApiKeys = [{ id: 1, name: 'Key 1' }];
      ApiKeyModel.findByUserId.mockResolvedValue(mockApiKeys);

      const result = await apiKeyRepository.findByUserId(1);

      expect(ApiKeyModel.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockApiKeys);
      
      // Restore the original method
      ApiKeyModel.find = originalFind;
    });
  });

  describe('findById', () => {
    it('should find API key by ID', async () => {
      const mockApiKey = { id: 1, name: 'Test Key' };
      const mockChain = {
        lean: jest.fn().mockResolvedValue(mockApiKey)
      };
      ApiKeyModel.findById.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findById(1);

      expect(ApiKeyModel.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findOne', () => {
    it('should find one API key using Mongoose-style', async () => {
      const mockApiKey = { id: 1, name: 'Test Key' };
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockApiKey)
      };
      ApiKeyModel.findOne.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findOne({ name: 'Test Key' });

      expect(ApiKeyModel.findOne).toHaveBeenCalledWith({ name: 'Test Key' });
      expect(mockChain.select).toHaveBeenCalledWith('-key');
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findOneAndUpdate', () => {
    it('should find and update API key using Mongoose-style', async () => {
      const mockApiKey = { id: 1, name: 'Updated Key' };
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockApiKey)
      };
      ApiKeyModel.findOneAndUpdate.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findOneAndUpdate(
        { id: 1 },
        { name: 'Updated Key' },
        { new: true }
      );

      expect(ApiKeyModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 1 },
        { name: 'Updated Key' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should find and update API key by ID', async () => {
      const mockApiKey = { id: 1, name: 'Updated Key' };
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockApiKey)
      };
      ApiKeyModel.findByIdAndUpdate.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findByIdAndUpdate(1, { name: 'Updated Key' });

      expect(ApiKeyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        1,
        { name: 'Updated Key' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findOneAndDelete', () => {
    it('should find and delete API key', async () => {
      const mockApiKey = { id: 1, name: 'Deleted Key' };
      const mockChain = {
        lean: jest.fn().mockResolvedValue(mockApiKey)
      };
      ApiKeyModel.findOneAndDelete.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findOneAndDelete({ id: 1 });

      expect(ApiKeyModel.findOneAndDelete).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findByIdAndDelete', () => {
    it('should find and delete API key by ID', async () => {
      const mockApiKey = { id: 1, name: 'Deleted Key' };
      const mockChain = {
        lean: jest.fn().mockResolvedValue(mockApiKey)
      };
      ApiKeyModel.findByIdAndDelete.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findByIdAndDelete(1);

      expect(ApiKeyModel.findByIdAndDelete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockApiKey);
    });
  });

  describe('findAllWithUsers', () => {
    it('should find all API keys with user data using Mongoose-style', async () => {
      const mockApiKeys = [
        { id: 1, name: 'Key 1', userId: { username: 'user1', email: 'user1@test.com' } }
      ];
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockApiKeys)
      };
      ApiKeyModel.find.mockReturnValue(mockChain);

      const result = await apiKeyRepository.findAllWithUsers();

      expect(ApiKeyModel.find).toHaveBeenCalledWith();
      expect(mockChain.select).toHaveBeenCalledWith('-key');
      expect(mockChain.populate).toHaveBeenCalledWith('userId', 'username email');
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockApiKeys);
    });

    it('should find all API keys with users using SQLite-style', async () => {
      // Temporarily remove find method to simulate SQLite
      const originalFind = ApiKeyModel.find;
      ApiKeyModel.find = undefined;
      
      const mockApiKeys = [
        { id: 1, name: 'Key 1', username: 'user1', email: 'user1@test.com' }
      ];
      ApiKeyModel.findAllWithUsers.mockResolvedValue(mockApiKeys);

      const result = await apiKeyRepository.findAllWithUsers();

      expect(ApiKeyModel.findAllWithUsers).toHaveBeenCalled();
      expect(result).toEqual(mockApiKeys);
      
      // Restore the original method
      ApiKeyModel.find = originalFind;
    });
  });
});
