const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// SQLite DB file path from environment variables or use default
const sqlitePath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../caddymanager.sqlite');
let db;

const connectToSQLite = () => {
	try {
		db = new Database(sqlitePath);
		console.log(`Connected to SQLite at ${sqlitePath}`);
		// Bootstrap tables and admin user
		createTablesIfNeeded();
		createDefaultAdminIfNeeded();
	} catch (error) {
		console.error('Failed to connect to SQLite:', error.message);
		process.exit(1);
	}
};

// Create tables if they do not exist
const createTablesIfNeeded = () => {
	// Users table (add more tables as needed)
	db.prepare(`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		role TEXT NOT NULL,
		isActive INTEGER NOT NULL DEFAULT 1
	)`).run();
	// Add more table creation statements here as needed
};

/**
 * Check if any users exist in the database.
 * If not, create a default admin user with credentials:
 * username: admin
 * password: caddyrocks
 */
const createDefaultAdminIfNeeded = () => {
	try {
		const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
		if (row.count === 0) {
			console.log('No users found in SQLite DB. Creating default admin user...');
			const username = 'admin';
			const rawPassword = 'caddyrocks';
			const hashedPassword = bcrypt.hashSync(rawPassword, 10);
			db.prepare(`INSERT INTO users (username, password, role, isActive) VALUES (?, ?, ?, ?)`)
				.run(username, hashedPassword, 'admin', 1);
			console.log('Default admin user created successfully.');
			console.log(`Username: ${username}`);
			console.log('Password: [hidden]');
			console.log('Please change this password immediately after first login.');
		}
	} catch (error) {
		console.error('Error creating default admin user in SQLite:', error.message);
		// Don't exit the process here, just log the error
	}
};

module.exports = {
	connectToSQLite,
	getDB: () => db
};
