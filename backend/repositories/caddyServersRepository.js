// Unified repository for CaddyServers data access
// Abstracts away differences between Mongoose and SQLite models

const CaddyServersModel = require('../models/caddyServers');

const caddyServersRepository = {
  /**
   * Create a new Caddy server
   * @param {Object} server - Server data
   * @returns {Promise<Object>} - Created server
   */
  async create(server) {
    if (typeof CaddyServersModel.create === 'function') {
      // Mongoose or SQLite
      return CaddyServersModel.create(server);
    }
    throw new Error('CaddyServersModel.create not implemented');
  },

  /**
   * Find all servers with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} - Array of servers
   */
  async findAll({ limit = 100, offset = 0 } = {}) {
    if (typeof CaddyServersModel.find === 'function') {
      const result = CaddyServersModel.find({});
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
    return CaddyServersModel.findAll({ limit, offset });
  },

  /**
   * Find server by ID
   * @param {string} id - Server ID
   * @returns {Promise<Object|null>} - Server object or null
   */
  async findById(id) {
    if (typeof CaddyServersModel.findById === 'function') {
      const result = await CaddyServersModel.findById(id);
      if (result && typeof result.toObject === 'function') {
        // Mongoose document
        return result.toObject();
      }
      // SQLite result or null
      return result;
    }
    throw new Error('CaddyServersModel.findById not implemented');
  },

  /**
   * Update server by ID
   * @param {string} id - Server ID
   * @param {Object} updateData - Data to update
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated server or null
   */
  async findByIdAndUpdate(id, updateData, options = {}) {
    if (typeof CaddyServersModel.findByIdAndUpdate === 'function') {
      // Mongoose
      return CaddyServersModel.findByIdAndUpdate(id, updateData, options);
    }
    // SQLite - implement update logic
    const db = require('../services/sqliteService').getDB();
    const existingServer = await this.findById(id);
    if (!existingServer) return null;

    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updateData).forEach(key => {
      if (key === 'tags') {
        updateFields.push(`${key} = ?`);
        updateValues.push(JSON.stringify(updateData[key]));
      } else if (key === 'lastPinged' && updateData[key] instanceof Date) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key].toISOString());
      } else {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    updateFields.push('updatedAt = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const stmt = db.prepare(`UPDATE caddy_servers SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...updateValues);

    return this.findById(id);
  },

  /**
   * Delete server by ID
   * @param {string} id - Server ID
   * @returns {Promise<Object|null>} - Deleted server or null
   */
  async findByIdAndDelete(id) {
    if (typeof CaddyServersModel.findByIdAndDelete === 'function') {
      // Mongoose
      return CaddyServersModel.findByIdAndDelete(id);
    }
    // SQLite
    const db = require('../services/sqliteService').getDB();
    const server = await this.findById(id);
    if (!server) return null;

    const stmt = db.prepare('DELETE FROM caddy_servers WHERE id = ?');
    stmt.run(id);
    return server;
  },

  /**
   * Find servers by query
   * @param {Object} query - Query object
   * @returns {Promise<Array>} - Array of servers
   */
  async find(query = {}) {
    if (typeof CaddyServersModel.find === 'function') {
      const result = CaddyServersModel.find(query);
      // Check if it's a Mongoose query (has lean method)
      if (result && typeof result.lean === 'function') {
        return result.lean();
      }
      // SQLite model - return directly
      return result;
    }
    throw new Error('CaddyServersModel.find not implemented');
  },

  /**
   * Check if a server exists by ID
   * @param {Object} query - Query object with _id
   * @returns {Promise<boolean>} - True if exists
   */
  async exists(query) {
    if (typeof CaddyServersModel.exists === 'function') {
      // Mongoose
      return CaddyServersModel.exists(query);
    }
    // SQLite
    const server = await this.findById(query._id);
    return server ? { _id: server.id } : null;
  },

  /**
   * Save a server instance (for compatibility with Mongoose instances)
   * @param {Object} server - Server object with save method or plain object
   * @returns {Promise<Object>} - Saved server
   */
  async save(server) {
    if (server.save && typeof server.save === 'function') {
      // Mongoose instance
      return server.save();
    }
    
    // For SQLite, update the server
    if (server.id || server._id) {
      const id = server.id || server._id;
      const updateData = { ...server };
      delete updateData.id;
      delete updateData._id;
      return this.findByIdAndUpdate(id, updateData, { new: true });
    }
    
    // Create new server
    return this.create(server);
  },

  /**
   * Create a new server instance (for compatibility with Mongoose model constructor)
   * @param {Object} serverData - Server data
   * @returns {Object} - Server instance with save method
   */
  createInstance(serverData) {
    if (CaddyServersModel.prototype && CaddyServersModel.prototype.save) {
      // Mongoose - create actual instance
      return new CaddyServersModel(serverData);
    }
    
    // SQLite - create mock instance with save method
    const instance = { ...serverData };
    instance.save = async () => {
      // Check if this is an update (has ID) or create (no ID)
      if (instance.id || instance._id) {
        const id = instance.id || instance._id;
        const updateData = { ...instance };
        delete updateData.id;
        delete updateData._id;
        delete updateData.save; // Remove the save method from update data
        return caddyServersRepository.findByIdAndUpdate(id, updateData, { new: true });
      }
      
      // Create new server
      const createData = { ...instance };
      delete createData.save; // Remove the save method from create data
      return caddyServersRepository.create(createData);
    };
    return instance;
  }
};

module.exports = caddyServersRepository;
