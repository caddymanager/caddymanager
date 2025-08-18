const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: {
    read: {
      type: Boolean,
      default: true
    },
    write: {
      type: Boolean,
      default: false
    },
    delete: {
      type: Boolean,
      default: false
    }
  },
  lastUsed: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1); // Default: 1 year expiration
      return date;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

// Method to generate a new API key
apiKeySchema.statics.generateKey = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Method to create a new API key for a user
apiKeySchema.statics.createApiKey = async function(userId, name, permissions = {}, expiration = null) {
  const key = this.generateKey();
  
  const apiKeyData = {
    name,
    key,
    userId,
    permissions: {
      ...{ read: true, write: false, delete: false },
      ...permissions
    }
  };
  
  if (expiration) {
    apiKeyData.expiresAt = expiration;
  }
  
  return await this.create(apiKeyData);
};

// Method to validate an API key
apiKeySchema.statics.validateApiKey = async function(key) {
  const apiKey = await this.findOne({ key, isActive: true });
  
  if (!apiKey) {
    return null;
  }
  
  // Check if the key has expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }
  
  // Update last used timestamp
  apiKey.lastUsed = new Date();
  await apiKey.save();
  
  return apiKey;
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;