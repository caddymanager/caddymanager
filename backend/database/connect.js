const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const dbConfig = require('./dbConfig');

async function connectToDatabase() {
  try {
  if (dbConfig.isProduction && dbConfig.uri) {
      await mongoose.connect(dbConfig.uri, dbConfig.options);
      console.log('Connected to MongoDB successfully');
    } else {
      const mongo = await MongoMemoryServer.create(dbConfig.memoryServerOptions);
      await mongoose.connect(mongo.getUri(), dbConfig.options);
      console.log("Connected to MongoDB memory server successfully");
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

module.exports = connectToDatabase;