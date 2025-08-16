// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Set default test environment variables
process.env.DB_ENGINE = process.env.DB_ENGINE || 'sqlite';
process.env.SQLITE_DB_PATH = ':memory:'; // Use in-memory SQLite for tests
process.env.NODE_ENV = 'test';

// Initialize SQLite service for tests
if (process.env.DB_ENGINE === 'sqlite') {
  const sqliteService = require('./services/sqliteService');
  // Initialize the SQLite database with proper schema
  sqliteService.connectToSQLite();
}

// Mock console methods to reduce noise in tests
if (process.env.JEST_SILENT !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global teardown for tests
afterAll(async () => {
  // Close database connections if needed
  if (process.env.DB_ENGINE === 'sqlite') {
    const sqliteService = require('./services/sqliteService');
    const db = sqliteService.getDB();
    if (db) {
      db.close();
    }
  }
});
