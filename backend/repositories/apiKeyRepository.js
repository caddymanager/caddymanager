// Unified repository for API key data access
// Abstracts away differences between Mongoose and SQLite models

const ApiKeyModel = require('../models/apiKey');

const apiKeyRepository = {
  // Helper to normalize different model return types (Mongoose Query, Promise, or direct value)
  async finalizeQuery(q) {
    if (!q) return q;
    // If Mongoose Query-like with exec()
    if (typeof q.exec === 'function') return await q.exec();
    // If it's thenable (Promise), await it
    if (typeof q.then === 'function') return await q;
    // Otherwise return as-is
    return q;
  },
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
      // Mongoose-like or custom. Call and inspect return value.
      const res = ApiKeyModel.find(query);
      if (res && typeof res.select === 'function') {
        // Mongoose Query - build the query and finalize
        const q = res.select('-key').sort({ createdAt: -1 }).lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      // Non-chainable implementation (may return a promise/result)
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findAll === 'function') {
      return ApiKeyModel.findAll(query);
    }
    throw new Error('ApiKeyModel.findAll/find not implemented');
  },

  async findByUserId(userId) {
    if (typeof ApiKeyModel.find === 'function') {
      const res = ApiKeyModel.find({ userId });
      if (res && typeof res.select === 'function') {
        const q = res.select('-key').sort({ createdAt: -1 }).lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findByUserId === 'function') {
      return ApiKeyModel.findByUserId(userId);
    }
    throw new Error('ApiKeyModel.findByUserId not implemented');
  },

  async findById(id) {
    if (typeof ApiKeyModel.findById === 'function') {
      const res = ApiKeyModel.findById(id);
      if (res && typeof res.lean === 'function') {
        const q = res.lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite
    if (typeof ApiKeyModel.findById === 'function') {
      return ApiKeyModel.findById(id);
    }
    throw new Error('ApiKeyModel.findById not implemented');
  },

  async findOne(query) {
    if (typeof ApiKeyModel.findOne === 'function') {
      const res = ApiKeyModel.findOne(query);
      if (res && typeof res.select === 'function') {
        const q = res.select('-key').lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findOne === 'function') {
      return ApiKeyModel.findOne(query);
    }
    throw new Error('ApiKeyModel.findOne not implemented');
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    if (typeof ApiKeyModel.findByIdAndUpdate === 'function') {
      const res = ApiKeyModel.findByIdAndUpdate(id, updateData, { 
        new: true, 
        runValidators: true, 
        ...options 
      });
      if (res && typeof res.select === 'function') {
        const q = res.select('-key').lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findByIdAndUpdate === 'function') {
      return ApiKeyModel.findByIdAndUpdate(id, updateData, options);
    }
    throw new Error('ApiKeyModel.findByIdAndUpdate not implemented');
  },

  async findOneAndUpdate(query, updateData, options = {}) {
    if (typeof ApiKeyModel.findOneAndUpdate === 'function') {
      const res = ApiKeyModel.findOneAndUpdate(query, updateData, { 
        new: true, 
        runValidators: true, 
        ...options 
      });
      if (res && typeof res.select === 'function') {
        return await res.select('-key').lean().exec();
      }
      return await res;
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findOneAndUpdate === 'function') {
      return ApiKeyModel.findOneAndUpdate(query, updateData, options);
    }
    throw new Error('ApiKeyModel.findOneAndUpdate not implemented');
  },

  async findOneAndDelete(query) {
    if (typeof ApiKeyModel.findOneAndDelete === 'function') {
      const res = ApiKeyModel.findOneAndDelete(query);
      if (res && typeof res.lean === 'function') {
        const q = res.lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findOneAndDelete === 'function') {
      return ApiKeyModel.findOneAndDelete(query);
    }
    throw new Error('ApiKeyModel.findOneAndDelete not implemented');
  },

  async findByIdAndDelete(id) {
    if (typeof ApiKeyModel.findByIdAndDelete === 'function') {
      const res = ApiKeyModel.findByIdAndDelete(id);
      if (res && typeof res.lean === 'function') {
        return await res.lean().exec?.() ?? await res.lean();
      }
      return await res;
    }
    // SQLite: implement as needed
    if (typeof ApiKeyModel.findByIdAndDelete === 'function') {
      return ApiKeyModel.findByIdAndDelete(id);
    }
    throw new Error('ApiKeyModel.findByIdAndDelete not implemented');
  },

  async findAllWithUsers() {
    if (typeof ApiKeyModel.find === 'function') {
      const res = ApiKeyModel.find();
      if (res && typeof res.select === 'function') {
        const q = res.select('-key').populate('userId', 'username email').sort({ createdAt: -1 }).lean();
        return await apiKeyRepository.finalizeQuery(q);
      }
      return await apiKeyRepository.finalizeQuery(res);
    }
    // SQLite: implement join with users table
    if (typeof ApiKeyModel.findAllWithUsers === 'function') {
      return ApiKeyModel.findAllWithUsers();
    }
    throw new Error('ApiKeyModel.findAllWithUsers not implemented');
  }
};

module.exports = apiKeyRepository;
