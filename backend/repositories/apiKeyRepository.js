// Unified repository for API key data access
// Abstracts away differences between Mongoose and SQLite models

const ApiKeyModel = require('../models/apiKey');

const apiKeyRepository = {
  async createApiKey(userId, name, permissions = {}, expiration = null) {
    if (typeof ApiKeyModel.createApiKey === 'function') {
      // Both Mongoose and SQLite models implement this
      return ApiKeyModel.createApiKey(userId, name, permissions, expiration);
    }
    throw new Error('ApiKeyModel.createApiKey not implemented');
  },

  async validateApiKey(key) {
    if (typeof ApiKeyModel.validateApiKey === 'function') {
      return ApiKeyModel.validateApiKey(key);
    }
    throw new Error('ApiKeyModel.validateApiKey not implemented');
  },

  async findAll(query = {}) {
    if (typeof ApiKeyModel.find === 'function') {
      // Mongoose
      return ApiKeyModel.find(query).lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findAll === 'function') {
      return ApiKeyModel.findAll(query);
    }
    throw new Error('ApiKeyModel.findAll/find not implemented');
  },

  async findById(id) {
    if (typeof ApiKeyModel.findById === 'function') {
      // Mongoose
      return ApiKeyModel.findById(id).lean();
    }
    if (typeof ApiKeyModel.findById === 'function') {
      // SQLite
      return ApiKeyModel.findById(id);
    }
    throw new Error('ApiKeyModel.findById not implemented');
  },

  // Add more methods as needed (update, delete, etc.)
};

module.exports = apiKeyRepository;
