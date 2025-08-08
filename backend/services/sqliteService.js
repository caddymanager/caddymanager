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
	// Users table (updated schema to match userSQLiteModel expectations)
	db.prepare(`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		email TEXT,
		password TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		isActive INTEGER NOT NULL DEFAULT 1,
		lastLogin TEXT,
		createdAt TEXT NOT NULL,
		updatedAt TEXT NOT NULL
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
			const now = new Date().toISOString();
			
			db.prepare(`INSERT INTO users (username, email, password, role, isActive, lastLogin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
				.run(username, null, hashedPassword, 'admin', 1, null, now, now);
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
