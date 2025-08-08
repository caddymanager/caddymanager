const crypto = require('crypto');
const { getDB } = require('../../services/sqliteService');

// Helper to serialize/deserialize permissions as JSON
function serializePermissions(permissions) {
	return JSON.stringify(permissions);
}
function deserializePermissions(str) {
	try {
		return JSON.parse(str);
	} catch {
		return { read: true, write: false, delete: false };
	}
}

// Ensure table exists (should be called at bootstrap, but safe to call here)
function ensureTable() {
	const db = getDB();
	db.prepare(`CREATE TABLE IF NOT EXISTS api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		key TEXT UNIQUE NOT NULL,
		userId INTEGER NOT NULL,
		permissions TEXT NOT NULL,
		lastUsed TEXT,
		expiresAt TEXT,
		createdAt TEXT NOT NULL,
		isActive INTEGER NOT NULL DEFAULT 1
	)`).run();
}

ensureTable();

const ApiKeySQLiteModel = {
	generateKey() {
		return crypto.randomBytes(32).toString('hex');
	},

	createApiKey(userId, name, permissions = {}, expiration = null) {
		const db = getDB();
		const key = this.generateKey();
		const now = new Date();
		const expiresAt = expiration ? new Date(expiration) : (() => {
			const d = new Date();
			d.setFullYear(d.getFullYear() + 1);
			return d;
		})();
		const perms = { read: true, write: false, delete: false, ...permissions };
		const stmt = db.prepare(`INSERT INTO api_keys (name, key, userId, permissions, expiresAt, createdAt, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)`);
		const info = stmt.run(
			name,
			key,
			userId,
			serializePermissions(perms),
			expiresAt.toISOString(),
			now.toISOString(),
			1
		);
		return { id: info.lastInsertRowid, name, key, userId, permissions: perms, expiresAt, createdAt: now, isActive: true };
	},

	validateApiKey(key) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM api_keys WHERE key = ? AND isActive = 1').get(key);
		if (!row) return null;
		if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;
		// Update lastUsed
		db.prepare('UPDATE api_keys SET lastUsed = ? WHERE id = ?').run(new Date().toISOString(), row.id);
		return {
			...row,
			permissions: deserializePermissions(row.permissions),
			lastUsed: row.lastUsed ? new Date(row.lastUsed) : null,
			expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			isActive: !!row.isActive
		};
	},

	// Add more CRUD methods as needed (find, deactivate, etc.)
};

module.exports = ApiKeySQLiteModel;
