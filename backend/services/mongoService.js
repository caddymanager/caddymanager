const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from environment variables or use default
const mongoURI = process.env.MONGODB_URI || '';

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    
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
    const User = require('../models/userModel');
    
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

module.exports = {
  connectToMongo
};