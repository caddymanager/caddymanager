// Dynamically select the correct CaddyConfig model based on DB_ENGINE
const dbEngine = process.env.DB_ENGINE || 'sqlite';
let CaddyConfigModel;

if (dbEngine === 'sqlite') {
	CaddyConfigModel = require('./caddyConfigSQLiteModel');
} else {
	CaddyConfigModel = require('./caddyConfigMongoModel');
}

module.exports = CaddyConfigModel;
