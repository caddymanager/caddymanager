// Unified repository for User data access
// Abstracts away differences between Mongoose and SQLite models

const UserModel = require('../models/user');

// Helper to detect database engine based on environment or model structure
const isMongoose = () => {
  const dbEngine = process.env.DB_ENGINE || 'sqlite';
  if (dbEngine === 'mongodb' || dbEngine === 'mongo') {
    return true;
  }
  // Also check if the model has Mongoose-like methods
  return typeof UserModel.findById === 'function' && 
         typeof UserModel.find === 'function' &&
         typeof UserModel.findOne === 'function';
};

const userRepository = {
  async create(userData) {
    if (isMongoose()) {
      return UserModel.create(userData);
    }
    // SQLite
    return UserModel.create(userData);
  },

  async findAll({ limit = 100, offset = 0, select } = {}) {
    if (isMongoose()) {
      // Mongoose
      let query = UserModel.find({})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      
      if (select) {
        query = query.select(select);
      }
      
      return query.lean();
    }
    // SQLite
    return UserModel.findAll({ limit, offset });
  },

  async findById(id, options = {}) {
    if (isMongoose()) {
      // Mongoose
      let query = UserModel.findById(id);
      
      if (options.includePassword) {
        query = query.select('+password');
      }
      
      return query.lean();
    }
    // SQLite
    if (options.includePassword) {
      return UserModel.findByIdWithPassword(id);
    }
    return UserModel.findById(id);
  },

  async findByUsername(username, options = {}) {
    if (isMongoose()) {
      // Mongoose
      let query = UserModel.findOne({ username });
      
      if (options.includePassword) {
        query = query.select('+password');
      }
      
      return query.lean();
    }
    // SQLite
    if (options.includePassword) {
      return UserModel.findByUsernameWithPassword(username);
    }
    return UserModel.findByUsername(username);
  },

  async findByEmail(email) {
    if (isMongoose()) {
      // Mongoose
      return UserModel.findOne({ email }).lean();
    }
    // SQLite
    return UserModel.findByEmail(email);
  },

  async findOne(criteria, options = {}) {
    if (isMongoose()) {
      // Mongoose
      let query = UserModel.findOne(criteria);
      
      if (options.includePassword) {
        query = query.select('+password');
      }
      
      return query.lean();
    }
    // SQLite - handle common criteria
    if (criteria.username) {
      return this.findByUsername(criteria.username, options);
    }
    if (criteria.email) {
      return this.findByEmail(criteria.email);
    }
    if (criteria._id || criteria.id) {
      const id = criteria._id || criteria.id;
      // Handle MongoDB ObjectId comparison like $ne
      if (typeof criteria._id === 'object' && criteria._id.$ne) {
        // For SQLite, we need a different approach for "not equal" queries
        return null; // Will implement if needed
      }
      return this.findById(id, options);
    }
    
    throw new Error('Unsupported criteria for SQLite findOne');
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    if (isMongoose()) {
      // Mongoose
      return UserModel.findByIdAndUpdate(id, updateData, {
        new: options.new || false,
        runValidators: options.runValidators || false,
        ...options
      }).lean();
    }
    // SQLite
    return UserModel.findByIdAndUpdate(id, updateData, {
      returnUpdatedDoc: options.new || false,
      ...options
    });
  },

  async findByIdAndDelete(id) {
    if (isMongoose()) {
      // Mongoose
      return UserModel.findByIdAndDelete(id).lean();
    }
    // SQLite
    return UserModel.findByIdAndDelete(id);
  },

  async updateLastLogin(id, lastLogin = new Date()) {
    if (isMongoose()) {
      // For Mongoose, we'll use findByIdAndUpdate
      return UserModel.findByIdAndUpdate(id, { lastLogin }, { new: true }).lean();
    }
    // SQLite
    const success = await UserModel.updateLastLogin(id, lastLogin);
    return success ? this.findById(id) : null;
  },

  async comparePassword(candidatePassword, hashedPassword) {
    if (isMongoose()) {
      // For Mongoose, this should be called on the user instance
      // But for repository pattern, we'll use bcrypt directly
      const bcrypt = require('bcryptjs');
      return bcrypt.compare(candidatePassword, hashedPassword);
    }
    // SQLite
    return UserModel.comparePassword(candidatePassword, hashedPassword);
  },

  async saveUser(userObj) {
    if (isMongoose()) {
      // For Mongoose, we need to work with the actual model instance
      if (userObj._id) {
        // Update existing
        const updateData = { ...userObj };
        delete updateData._id;
        delete updateData.createdAt;
        return this.findByIdAndUpdate(userObj._id, updateData, { new: true });
      } else {
        // Create new
        return this.create(userObj);
      }
    }
    // SQLite
    return UserModel.saveUser(userObj);
  },

  // Method to check if username exists (excluding a specific user ID)
  async isUsernameExists(username, excludeId = null) {
    if (isMongoose()) {
      const criteria = { username };
      if (excludeId) {
        criteria._id = { $ne: excludeId };
      }
      return !!(await UserModel.findOne(criteria));
    }
    // SQLite - simple check for now
    const user = await this.findByUsername(username);
    if (!user) return false;
    if (excludeId && user.id == excludeId) return false;
    return true;
  },

  // Method to check if email exists (excluding a specific user ID)
  async isEmailExists(email, excludeId = null) {
    if (isMongoose()) {
      const criteria = { email };
      if (excludeId) {
        criteria._id = { $ne: excludeId };
      }
      return !!(await UserModel.findOne(criteria));
    }
    // SQLite - simple check for now
    const user = await this.findByEmail(email);
    if (!user) return false;
    if (excludeId && user.id == excludeId) return false;
    return true;
  }
};

module.exports = userRepository;
