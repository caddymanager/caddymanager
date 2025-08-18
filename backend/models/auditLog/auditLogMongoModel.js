const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String,
      required: true
    }
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['config', 'server', 'user', 'apiKey', 'system', 'other']
  },
  resourceId: {
    type: String
  },
  details: {
    type: Object,
    default: {}
  },
  statusCode: {
    type: Number
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  // Enable automatic timestamps
  timestamps: true
});

// Create a TTL index that will automatically delete documents after the configured time period
// The actual expiration time will be set during model initialization from environment variables

// Create a capped collection option (will be configured in the service)
// This ensures the collection doesn't grow beyond a certain size

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;