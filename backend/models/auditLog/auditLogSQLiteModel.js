const { getDB } = require('../../services/sqliteService');

// Ensure table exists
function ensureTable() {
	const db = getDB();
	db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT NOT NULL,
		userId INTEGER,
		username TEXT NOT NULL,
		resourceType TEXT NOT NULL,
		resourceId TEXT,
		details TEXT,
		statusCode INTEGER,
		ipAddress TEXT,
		userAgent TEXT,
		timestamp TEXT NOT NULL,
		createdAt TEXT NOT NULL,
		updatedAt TEXT NOT NULL
	)`).run();
}

ensureTable();

const AuditLogSQLiteModel = {
	create(log) {
		const db = getDB();
		const now = new Date();
		const stmt = db.prepare(`INSERT INTO audit_logs (
			action, userId, username, resourceType, resourceId, details, statusCode, ipAddress, userAgent, timestamp, createdAt, updatedAt
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
		const info = stmt.run(
			log.action,
			log.user && log.user.userId ? log.user.userId : null,
			log.user && log.user.username ? log.user.username : '',
			log.resourceType,
			log.resourceId || null,
			JSON.stringify(log.details || {}),
			log.statusCode || null,
			log.ipAddress || null,
			log.userAgent || null,
			(log.timestamp ? new Date(log.timestamp) : now).toISOString(),
			now.toISOString(),
			now.toISOString()
		);
		return { id: info.lastInsertRowid, _id: info.lastInsertRowid, ...log, createdAt: now, updatedAt: now };
	},

	findAll({ limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(limit, offset);
		return rows.map(row => ({
			...row,
			_id: row.id, // Add _id for MongoDB compatibility
			details: row.details ? JSON.parse(row.details) : {},
			timestamp: row.timestamp ? new Date(row.timestamp) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
		}));
	},

	findById(id) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id);
		if (!row) return null;
		return {
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			details: row.details ? JSON.parse(row.details) : {},
			timestamp: row.timestamp ? new Date(row.timestamp) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
		};
	},

	findByResource(resourceType, resourceId, { limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM audit_logs WHERE resourceType = ? AND resourceId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?')
			.all(resourceType, resourceId, limit, offset);
		return rows.map(row => ({
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			details: row.details ? JSON.parse(row.details) : {},
			timestamp: row.timestamp ? new Date(row.timestamp) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
		}));
	},

	findByUser(userId, { limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM audit_logs WHERE userId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?')
			.all(userId, limit, offset);
		return rows.map(row => ({
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			details: row.details ? JSON.parse(row.details) : {},
			timestamp: row.timestamp ? new Date(row.timestamp) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
		}));
	},

	getFilterOptions() {
		const db = getDB();
		const actions = db.prepare('SELECT DISTINCT action FROM audit_logs').all().map(r => r.action);
		const resourceTypes = db.prepare('SELECT DISTINCT resourceType FROM audit_logs').all().map(r => r.resourceType);
		const users = db.prepare('SELECT DISTINCT username FROM audit_logs').all().map(r => r.username);
		return { actions, resourceTypes, users };
	},

	getStats() {
		const db = getDB();
		const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
		const byAction = db.prepare('SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action').all();
		const byResourceType = db.prepare('SELECT resourceType, COUNT(*) as count FROM audit_logs GROUP BY resourceType').all();
		return { total, byAction, byResourceType };
	}
};

module.exports = AuditLogSQLiteModel;
