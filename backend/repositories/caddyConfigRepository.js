// Unified repository for CaddyConfig data access
// Abstracts away differences between Mongoose and SQLite models

const CaddyConfigModel = require('../models/caddyConfig');

const caddyConfigRepository = {
  /**
   * Create a new Caddy configuration
   * @param {Object} config - Configuration data
   * @returns {Promise<Object>} - Created configuration
   */
  async create(config) {
    if (typeof CaddyConfigModel.create === 'function') {
      // Mongoose or SQLite
      return CaddyConfigModel.create(config);
    }
    throw new Error('CaddyConfigModel.create not implemented');
  },

  /**
   * Find all configurations with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} - Array of configurations
   */
  async findAll({ limit = 100, offset = 0 } = {}) {
    if (typeof CaddyConfigModel.find === 'function') {
      const result = CaddyConfigModel.find({});
      // Check if it's a Mongoose query (has lean method)
      if (result && typeof result.lean === 'function') {
        return result
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean();
      }
    }
    // SQLite
    return CaddyConfigModel.findAll({ limit, offset });
  },

  /**
   * Find configuration by ID
   * @param {string} id - Configuration ID
   * @returns {Promise<Object|null>} - Configuration object or null
   */
  async findById(id) {
    if (typeof CaddyConfigModel.findById === 'function') {
      const result = await CaddyConfigModel.findById(id);
      if (result && typeof result.toObject === 'function') {
        // Mongoose document
        return result.toObject();
      }
      // SQLite result or null
      return result;
    }
    throw new Error('CaddyConfigModel.findById not implemented');
  },

  /**
   * Find configurations by query with populate support
   * @param {Object} query - Query object
   * @returns {Promise<Array>} - Array of configurations
   */
  async find(query = {}) {
    if (typeof CaddyConfigModel.find === 'function') {
      const result = CaddyConfigModel.find(query);
      // Check if it's a Mongoose query (has lean method)
      if (result && typeof result.lean === 'function') {
        let mongoQuery = result;
        
        // Check if we need to populate servers
        if (query._populate) {
          mongoQuery = mongoQuery.populate('servers', 'name');
          delete query._populate;
        }
        
        return mongoQuery.sort({ createdAt: -1 }).lean();
      }
      // SQLite model - return directly
      return result;
    }
    throw new Error('CaddyConfigModel.find not implemented');
  },

  /**
   * Find configurations with populate support
   * @param {Object} query - Query object
   * @returns {Object} - Query builder object
   */
  findWithPopulate(query = {}) {
    if (typeof CaddyConfigModel.find === 'function') {
      // Mongoose
      return {
        populate: (field, select) => {
          return {
            sort: (sortObj) => {
              return CaddyConfigModel.find(query)
                .populate(field, select)
                .sort(sortObj)
                .lean();
            }
          };
        }
      };
    }
    
    // SQLite - for now just return the configs without actual population
    return {
      populate: (field, select) => {
        return {
          sort: (sortObj) => {
            return this.find({ ...query, _populate: true });
          }
        };
      }
    };
  },

  /**
   * Update configuration by ID
   * @param {string} id - Configuration ID
   * @param {Object} updateData - Data to update
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated configuration or null
   */
  async findByIdAndUpdate(id, updateData, options = {}) {
    if (typeof CaddyConfigModel.findByIdAndUpdate === 'function') {
      // Mongoose
      return CaddyConfigModel.findByIdAndUpdate(id, updateData, options);
    }
    
    // SQLite - implement update logic
    const db = require('../services/sqliteService').getDB();
    const existingConfig = await this.findById(id);
    if (!existingConfig) return null;

    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updateData).forEach(key => {
      if (key === 'servers' || key === 'jsonConfig' || key === 'metadata' || key === 'history') {
        updateFields.push(`${key} = ?`);
        updateValues.push(JSON.stringify(updateData[key]));
      } else {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    updateFields.push('updatedAt = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const stmt = db.prepare(`UPDATE caddy_configs SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...updateValues);

    if (options.new) {
      return this.findById(id);
    }
    return existingConfig;
  },

  /**
   * Delete configuration by ID
   * @param {string} id - Configuration ID
   * @returns {Promise<Object|null>} - Deleted configuration or null
   */
  async findByIdAndDelete(id) {
    if (typeof CaddyConfigModel.findByIdAndDelete === 'function') {
      // Mongoose
      return CaddyConfigModel.findByIdAndDelete(id);
    }
    
    // SQLite
    const db = require('../services/sqliteService').getDB();
    const config = await this.findById(id);
    if (!config) return null;

    const stmt = db.prepare('DELETE FROM caddy_configs WHERE id = ?');
    stmt.run(id);
    return config;
  },

  /**
   * Save a configuration instance (for compatibility with Mongoose instances)
   * @param {Object} config - Configuration object with save method or plain object
   * @returns {Promise<Object>} - Saved configuration
   */
  async save(config) {
    if (config.save && typeof config.save === 'function') {
      // Mongoose instance
      return config.save();
    }
    
    // For SQLite, update the configuration
    if (config.id || config._id) {
      const id = config.id || config._id;
      const updateData = { ...config };
      delete updateData.id;
      delete updateData._id;
      return this.findByIdAndUpdate(id, updateData, { new: true });
    }
    
    // Create new configuration
    return this.create(config);
  },

  /**
   * Create a new configuration instance (for compatibility with Mongoose model constructor)
   * @param {Object} configData - Configuration data
   * @returns {Object} - Configuration instance with save method
   */
  createInstance(configData) {
    if (CaddyConfigModel.prototype && CaddyConfigModel.prototype.save) {
      // Mongoose - create actual instance
      return new CaddyConfigModel(configData);
    }
    
    // SQLite - create mock instance with save method
    const instance = { ...configData };
    instance.save = async () => {
      // Check if this is an update (has ID) or create (no ID)
      if (instance.id || instance._id) {
        const id = instance.id || instance._id;
        const updateData = { ...instance };
        delete updateData.id;
        delete updateData._id;
        delete updateData.save; // Remove the save method from update data
        return caddyConfigRepository.findByIdAndUpdate(id, updateData, { new: true });
      }
      
      // Create new configuration
      const createData = { ...instance };
      delete createData.save; // Remove the save method from create data
      return caddyConfigRepository.create(createData);
    };
    return instance;
  }
};

module.exports = caddyConfigRepository;
