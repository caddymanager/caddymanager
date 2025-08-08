// Dynamically select the correct API key model based on DB_ENGINE
const dbEngine = process.env.DB_ENGINE || 'sqlite';
let ApiKeyModel;

if (dbEngine === 'sqlite') {
	ApiKeyModel = require('./apiKeySQLiteModel');
} else {
	ApiKeyModel = require('./apiKeyMongoModel');
}

module.exports = ApiKeyModel;
