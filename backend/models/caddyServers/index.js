// Dynamically select the correct CaddyServers model based on DB_ENGINE
const dbEngine = process.env.DB_ENGINE || 'sqlite';
let CaddyServersModel;

if (dbEngine === 'sqlite') {
	CaddyServersModel = require('./caddyServersSQLiteModel');
} else {
	CaddyServersModel = require('./caddyServersMongoModel');
}

module.exports = CaddyServersModel;
