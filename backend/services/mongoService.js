const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dbConfig = require('../config/dbConfig');
require('dotenv').config();

let mongoServer = null; // Keep reference to memory server instance

const connectToMongo = async () => {
  try {
    if (dbConfig.isProduction && dbConfig.uri) {
      // Production: Use real MongoDB
      await mongoose.connect(dbConfig.uri, dbConfig.options);
      console.log('Connected to MongoDB successfully (Production)');
    } else {
      // Development: Use MongoDB Memory Server
      console.log('Starting MongoDB Memory Server for development...');
      mongoServer = await MongoMemoryServer.create(dbConfig.memoryServerOptions);
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, dbConfig.options);
      console.log('Connected to MongoDB Memory Server successfully (Development)');
      console.log(`Memory Server URI: ${uri}`);
    }
    
    // Check for and create admin user if none exists
    await createDefaultAdminIfNeeded();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1); // Exit with failure
  }
};

/**
 * Check if any users exist in the database.
 * If not, create a default admin user with credentials:
 * username: admin
 * password: caddyrocks
 */
const createDefaultAdminIfNeeded = async () => {
  try {
    // We need to require the User model here to avoid circular dependencies
    const User = require('../models/user/userMongoModel');
    
    // Count users in the database
    const userCount = await User.countDocuments();
    
    // If no users exist, create the default admin
    if (userCount === 0) {
      console.log('No users found in database. Creating default admin user...');
      
      const adminUser = new User({
        username: 'admin',
        password: 'caddyrocks', // This will be hashed by the pre-save hook
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log('Default admin user created successfully.');
      console.log('Username: admin');
      console.log('Password: caddyrocks');
      console.log('Please change this password immediately after first login.');
    }
  } catch (error) {
    console.error('Error creating default admin user:', error.message);
    // Don't exit the process here, just log the error
  }
};

/**
 * Gracefully disconnect from MongoDB and stop memory server if running
 */
const disconnectFromMongo = async () => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    if (mongoServer) {
      await mongoServer.stop();
      console.log('MongoDB Memory Server stopped');
    }
  } catch (error) {
    console.error('Error during MongoDB disconnect:', error.message);
  }
};

module.exports = {
  connectToMongo,
  disconnectFromMongo,
  getMongoServer: () => mongoServer
};