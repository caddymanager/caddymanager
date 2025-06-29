const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for storing Caddy server configurations in JSON format
 * This allows tracking historical configurations and switching between them
 */
const caddyConfigSchema = new Schema({
  // References to the associated servers
  servers: [{
    type: Schema.Types.ObjectId,
    ref: 'CaddyServer',
    required: true
  }],
  // User-friendly name for this configuration
  name: {
    type: String,
    required: true,
    trim: true
  },
  // The configuration format (always json now)
  format: {
    type: String,
    default: 'json',
    enum: ['json']
  },
  // JSON configuration content
  jsonConfig: {
    type: Object,
    required: true
  },
  // Current status of this configuration
  status: {
    type: String,
    enum: ['draft', 'live', 'archived'],
    default: 'draft'
  },
  // Metadata about this configuration
  metadata: {
    description: {
      type: String,
      trim: true
    },
    version: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true
    }]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property to get the configuration content
caddyConfigSchema.virtual('content').get(function() {
  return this.jsonConfig;
});

// Pre-save hook to ensure backward compatibility
caddyConfigSchema.pre('save', function(next) {
  // Ensure backward compatibility - if we have a single server field populated, make sure it's also in the servers array
  if (this.server && this.servers && !this.servers.some(s => s.equals(this.server))) {
    this.servers.push(this.server);
  }

  // If servers is empty but server exists, migrate it
  if ((!this.servers || this.servers.length === 0) && this.server) {
    this.servers = [this.server];
  }

  next();
});

// Create the model
const CaddyConfig = mongoose.model('CaddyConfig', caddyConfigSchema);

module.exports = CaddyConfig;