// Unified repository for User data access
// Abstracts away differences between Mongoose and SQLite models

const UserModel = require('../models/user');

const userRepository = {
  async create(user) {
    if (typeof UserModel.create === 'function') {
      return UserModel.create(user);
    }
    throw new Error('UserModel.create not implemented');
  },

  async findAll({ limit = 100, offset = 0 } = {}) {
    if (typeof UserModel.find === 'function') {
      // Mongoose
      return UserModel.find({})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    }
    // SQLite
    return UserModel.findAll({ limit, offset });
  },

  async findById(id) {
    if (typeof UserModel.findById === 'function') {
      // Mongoose
      return UserModel.findById(id).lean();
    }
    // SQLite
    return UserModel.findById(id);
  },

  async findByUsername(username) {
    if (typeof UserModel.findOne === 'function') {
      // Mongoose
      return UserModel.findOne({ username }).lean();
    }
    // SQLite
    return UserModel.findByUsername(username);
  },

  async comparePassword(candidatePassword, hashedPassword) {
    if (typeof UserModel.comparePassword === 'function') {
      // Mongoose instance method, not static
      // Should be called on a user instance, but for compatibility:
      return UserModel.comparePassword(candidatePassword, hashedPassword);
    }
    // SQLite
    return UserModel.comparePassword(candidatePassword, hashedPassword);
  },

  // Add more methods as needed (update, delete, etc.)
};

module.exports = userRepository;
