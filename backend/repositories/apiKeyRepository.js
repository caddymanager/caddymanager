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
      return ApiKeyModel.find(query).select('-key').sort({ createdAt: -1 }).lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findAll === 'function') {
      return ApiKeyModel.findAll(query);
    }
    throw new Error('ApiKeyModel.findAll/find not implemented');
  },

  async findByUserId(userId) {
    if (typeof ApiKeyModel.find === 'function') {
      // Mongoose
      return ApiKeyModel.find({ userId }).select('-key').sort({ createdAt: -1 }).lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findByUserId === 'function') {
      return ApiKeyModel.findByUserId(userId);
    }
    throw new Error('ApiKeyModel.findByUserId not implemented');
  },

  async findById(id) {
    if (typeof ApiKeyModel.findById === 'function') {
      // Mongoose
      return ApiKeyModel.findById(id).lean();
    }
    // SQLite
    if (typeof ApiKeyModel.findById === 'function') {
      return ApiKeyModel.findById(id);
    }
    throw new Error('ApiKeyModel.findById not implemented');
  },

  async findOne(query) {
    if (typeof ApiKeyModel.findOne === 'function') {
      // Mongoose
      return ApiKeyModel.findOne(query).select('-key').lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findOne === 'function') {
      return ApiKeyModel.findOne(query);
    }
    throw new Error('ApiKeyModel.findOne not implemented');
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    if (typeof ApiKeyModel.findByIdAndUpdate === 'function') {
      // Mongoose
      return ApiKeyModel.findByIdAndUpdate(id, updateData, { 
        new: true, 
        runValidators: true, 
        ...options 
      }).select('-key').lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findByIdAndUpdate === 'function') {
      return ApiKeyModel.findByIdAndUpdate(id, updateData, options);
    }
    throw new Error('ApiKeyModel.findByIdAndUpdate not implemented');
  },

  async findOneAndUpdate(query, updateData, options = {}) {
    if (typeof ApiKeyModel.findOneAndUpdate === 'function') {
      // Mongoose
      return ApiKeyModel.findOneAndUpdate(query, updateData, { 
        new: true, 
        runValidators: true, 
        ...options 
      }).select('-key').lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findOneAndUpdate === 'function') {
      return ApiKeyModel.findOneAndUpdate(query, updateData, options);
    }
    throw new Error('ApiKeyModel.findOneAndUpdate not implemented');
  },

  async findOneAndDelete(query) {
    if (typeof ApiKeyModel.findOneAndDelete === 'function') {
      // Mongoose
      return ApiKeyModel.findOneAndDelete(query).lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findOneAndDelete === 'function') {
      return ApiKeyModel.findOneAndDelete(query);
    }
    throw new Error('ApiKeyModel.findOneAndDelete not implemented');
  },

  async findByIdAndDelete(id) {
    if (typeof ApiKeyModel.findByIdAndDelete === 'function') {
      // Mongoose
      return ApiKeyModel.findByIdAndDelete(id).lean();
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findByIdAndDelete === 'function') {
      return ApiKeyModel.findByIdAndDelete(id);
    }
    throw new Error('ApiKeyModel.findByIdAndDelete not implemented');
  },

  async findAllWithUsers() {
    if (typeof ApiKeyModel.find === 'function') {
      // Mongoose - populate userId with username and email
      return ApiKeyModel.find()
        .select('-key')
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .lean();
    }
    // SQLite: implement join with users table
    if (typeof ApiKeyModel.findAllWithUsers === 'function') {
      return ApiKeyModel.findAllWithUsers();
    }
    throw new Error('ApiKeyModel.findAllWithUsers not implemented');
  }
};

module.exports = apiKeyRepository;
