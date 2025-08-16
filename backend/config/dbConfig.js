require('dotenv').config(); 

const isProduction = process.env.NODE_ENV === 'production';

const dbConfig = {
  uri: process.env.MONGODB_URI || '', 
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  isProduction,
  memoryServerOptions: {
    instance: { dbName: 'caddyManagerDevDB' },
    binary: {
      version: '6.0.4', // Use a stable version
    },
  },
};

module.exports = dbConfig;
