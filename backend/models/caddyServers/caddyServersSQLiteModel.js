const { getDB, connectToSQLite } = require('../../services/sqliteService');

// Ensure table exists
function ensureTable() {
	try {
		const db = getDB();
		if (!db) {
			connectToSQLite();
		}
		const dbInstance = getDB();
		dbInstance.prepare(`CREATE TABLE IF NOT EXISTS caddy_servers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			apiUrl TEXT NOT NULL,
			apiPort INTEGER DEFAULT 2019,
			adminApiPath TEXT DEFAULT '/config/',
			active INTEGER DEFAULT 1,
			tags TEXT DEFAULT '[]',
			description TEXT,
			lastPinged TEXT,
			status TEXT DEFAULT 'unknown',
			activeConfig INTEGER,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		)`).run();
	} catch (error) {
		console.error('Error ensuring caddy_servers table:', error.message);
	}
}

ensureTable();

const CaddyServersSQLiteModel = {
	create(server) {
		const db = getDB();
		const now = new Date();
		const stmt = db.prepare(`INSERT INTO caddy_servers (
			name, apiUrl, apiPort, adminApiPath, active, tags, description, lastPinged, status, activeConfig, createdAt, updatedAt
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
		const info = stmt.run(
			server.name,
			server.apiUrl,
			server.apiPort || 2019,
			server.adminApiPath || '/config/',
			server.active !== undefined ? (server.active ? 1 : 0) : 1,
			JSON.stringify(server.tags || []),
			server.description || null,
			server.lastPinged ? new Date(server.lastPinged).toISOString() : null,
			server.status || 'unknown',
			server.activeConfig || null,
			now.toISOString(),
			now.toISOString()
		);
		
		const createdServer = this.findById(info.lastInsertRowid);
		// Add save method for compatibility
		createdServer.save = async function() {
			const updateData = { ...this };
			delete updateData.id;
			delete updateData._id;
			delete updateData.save;
			return CaddyServersSQLiteModel.findByIdAndUpdate(this.id, updateData, { new: true });
		};
		return createdServer;
	},

	findAll({ limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM caddy_servers ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
		return rows.map(row => this._formatRow(row));
	},

	findById(id) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM caddy_servers WHERE id = ?').get(id);
		if (!row) return null;
		return this._formatRow(row);
	},

	find(query = {}) {
		const db = getDB();
		let sql = 'SELECT * FROM caddy_servers';
		const params = [];

		if (Object.keys(query).length > 0) {
			const conditions = [];
			Object.keys(query).forEach(key => {
				if (key === 'activeConfig') {
					conditions.push(`${key} = ?`);
					params.push(query[key]);
				}
			});
			
			if (conditions.length > 0) {
				sql += ` WHERE ${conditions.join(' AND ')}`;
			}
		}

		const rows = db.prepare(sql).all(...params);
		return rows.map(row => this._formatRow(row));
	},

	findByIdAndUpdate(id, updateData, options = {}) {
		const db = getDB();
		const existingServer = this.findById(id);
		if (!existingServer) return null;

		const updateFields = [];
		const updateValues = [];
		
		Object.keys(updateData).forEach(key => {
			if (key === 'tags') {
				updateFields.push(`${key} = ?`);
				updateValues.push(JSON.stringify(updateData[key]));
			} else if (key === 'lastPinged') {
				updateFields.push(`${key} = ?`);
				if (updateData[key] instanceof Date) {
					updateValues.push(updateData[key].toISOString());
				} else if (updateData[key]) {
					updateValues.push(new Date(updateData[key]).toISOString());
				} else {
					updateValues.push(null);
				}
			} else if (key === 'active') {
				updateFields.push(`${key} = ?`);
				updateValues.push(updateData[key] ? 1 : 0);
			} else if (typeof updateData[key] === 'object' && updateData[key] !== null) {
				// For objects, stringify them
				updateFields.push(`${key} = ?`);
				updateValues.push(JSON.stringify(updateData[key]));
			} else {
				updateFields.push(`${key} = ?`);
				updateValues.push(updateData[key]);
			}
		});

		updateFields.push('updatedAt = ?');
		updateValues.push(new Date().toISOString());
		updateValues.push(id);

		const stmt = db.prepare(`UPDATE caddy_servers SET ${updateFields.join(', ')} WHERE id = ?`);
		stmt.run(...updateValues);

		return options.new ? this.findById(id) : existingServer;
	},

	findByIdAndDelete(id) {
		const db = getDB();
		const server = this.findById(id);
		if (!server) return null;

		const stmt = db.prepare('DELETE FROM caddy_servers WHERE id = ?');
		stmt.run(id);
		return server;
	},

	exists(query) {
		if (query._id) {
			const server = this.findById(query._id);
			return server ? { _id: server.id } : null;
		}
		return null;
	},

	_formatRow(row) {
		const formatted = {
			...row,
			_id: row.id, // Add _id for Mongoose compatibility
			active: !!row.active,
			tags: row.tags ? JSON.parse(row.tags) : [],
			lastPinged: row.lastPinged ? new Date(row.lastPinged) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
		};
		
		// Add save method for compatibility
		formatted.save = async function() {
			const updateData = { ...this };
			delete updateData.id;
			delete updateData._id;
			delete updateData.save;
			return CaddyServersSQLiteModel.findByIdAndUpdate(this.id, updateData, { new: true });
		};
		
		return formatted;
	}
};

module.exports = CaddyServersSQLiteModel;
