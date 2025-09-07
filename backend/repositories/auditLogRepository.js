// Unified repository for audit log data access
// This abstracts away the differences between Mongoose and SQLite models

const AuditLogModel = require('../models/auditLog');

const auditLogRepository = {
  async create(log) {
    if (typeof AuditLogModel.create === 'function' && AuditLogModel.create.length >= 1) {
      // Mongoose: returns a Promise
      if (AuditLogModel.create.prototype && AuditLogModel.create.prototype.save) {
        // Defensive: if create returns a model instance
        const doc = new AuditLogModel(log);
        return doc.save();
      }
      // SQLite or static create
      return AuditLogModel.create(log);
    }
    throw new Error('AuditLogModel.create not implemented');
  },

  async findAll({ limit = 100, offset = 0 } = {}) {
    if (typeof AuditLogModel.find === 'function') {
      // Mongoose
      return AuditLogModel.find({})
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    }
    // SQLite
    return AuditLogModel.findAll({ limit, offset });
  },

  async findById(id) {
    if (typeof AuditLogModel.findById === 'function') {
      const result = await AuditLogModel.findById(id);
      if (result && typeof result.toObject === 'function') {
        // Mongoose document
        return result.toObject();
      }
      // SQLite result or null
      return result;
    }
    throw new Error('AuditLogModel.findById not implemented');
  },

  async findByResource(resourceType, resourceId, { limit = 100, offset = 0 } = {}) {
    if (typeof AuditLogModel.find === 'function') {
      // Mongoose
      return AuditLogModel.find({ resourceType, resourceId })
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    }
    // SQLite
    return AuditLogModel.findByResource(resourceType, resourceId, { limit, offset });
  },

  async findByUser(userId, { limit = 100, offset = 0 } = {}) {
    if (typeof AuditLogModel.find === 'function') {
      // Mongoose
      return AuditLogModel.find({ 'user.userId': userId })
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    }
    // SQLite
    return AuditLogModel.findByUser(userId, { limit, offset });
  },

  async getFilterOptions() {
    if (typeof AuditLogModel.distinct === 'function') {
      // Mongoose
      const actions = await AuditLogModel.distinct('action');
      const resourceTypes = await AuditLogModel.distinct('resourceType');
      const users = await AuditLogModel.distinct('user.username');
      return { actions, resourceTypes, users };
    }
    // SQLite
    return AuditLogModel.getFilterOptions();
  },

  async getStats() {
    if (typeof AuditLogModel.aggregate === 'function') {
      // Mongoose aggregation for stats
      const total = await AuditLogModel.countDocuments();
      const byAction = await AuditLogModel.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]);
      const byResourceType = await AuditLogModel.aggregate([
        { $group: { _id: '$resourceType', count: { $sum: 1 } } }
      ]);
      return {
        total,
        byAction: byAction.map(a => ({ action: a._id, count: a.count })),
        byResourceType: byResourceType.map(r => ({ resourceType: r._id, count: r.count }))
      };
    }
    // SQLite
    return AuditLogModel.getStats();
  }
};

module.exports = auditLogRepository;
