const bcrypt = require('bcryptjs');
const { getDB } = require('../../services/sqliteService');

// Ensure table exists
function ensureTable() {
	const db = getDB();
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
}

ensureTable();

const UserSQLiteModel = {
	async create(user) {
		const db = getDB();
		const now = new Date();
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(user.password, salt);
		const stmt = db.prepare(`INSERT INTO users (
			username, email, password, role, isActive, lastLogin, createdAt, updatedAt
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
		const info = stmt.run(
			user.username,
			user.email || null,
			hashedPassword,
			user.role || 'user',
			user.isActive !== undefined ? (user.isActive ? 1 : 0) : 1,
			user.lastLogin ? new Date(user.lastLogin).toISOString() : null,
			now.toISOString(),
			now.toISOString()
		);
		return { id: info.lastInsertRowid, ...user, password: undefined, createdAt: now, updatedAt: now };
	},

	findAll({ limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
		return rows.map(row => ({
			...row,
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			password: undefined
		}));
	},

	findById(id) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
		if (!row) return null;
		return {
			...row,
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			password: undefined
		};
	},

	findByUsername(username) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
		if (!row) return null;
		return {
			...row,
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			password: row.password // for password comparison only
		};
	},

	async comparePassword(candidatePassword, hashedPassword) {
		return await bcrypt.compare(candidatePassword, hashedPassword);
	},

	// Add more CRUD methods as needed (update, delete, etc.)
};

module.exports = UserSQLiteModel;
