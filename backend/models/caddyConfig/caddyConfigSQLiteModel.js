const { getDB, connectToSQLite } = require('../../services/sqliteService');

// Ensure table exists
function ensureTable() {
	try {
		const db = getDB();
		if (!db) {
			connectToSQLite();
		}
		const dbInstance = getDB();
		dbInstance.prepare(`CREATE TABLE IF NOT EXISTS caddy_configs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			servers TEXT NOT NULL,
			name TEXT NOT NULL,
			format TEXT NOT NULL DEFAULT 'json',
			jsonConfig TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			metadata TEXT,
			history TEXT,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		)`).run();

		// Add history column if it doesn't exist (for backwards compatibility)
		try {
			dbInstance.prepare(`ALTER TABLE caddy_configs ADD COLUMN history TEXT`).run();
		} catch (err) {
			// Column already exists or other error, ignore
		}
	} catch (error) {
		console.error('Error ensuring caddy_configs table:', error.message);
	}
}

ensureTable();

const CaddyConfigSQLiteModel = {
	create(config) {
		const db = getDB();
		const now = new Date();
		const stmt = db.prepare(`INSERT INTO caddy_configs (
			servers, name, format, jsonConfig, status, metadata, history, createdAt, updatedAt
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
		const info = stmt.run(
			JSON.stringify(config.servers || []),
			config.name,
			config.format || 'json',
			JSON.stringify(config.jsonConfig),
			config.status || 'draft',
			JSON.stringify(config.metadata || {}),
			JSON.stringify(config.history || []),
			now.toISOString(),
			now.toISOString()
		);
		
		const createdConfig = this.findById(info.lastInsertRowid);
		// Add save method for compatibility
		createdConfig.save = async function() {
			const updateData = { ...this };
			delete updateData.id;
			delete updateData._id;
			delete updateData.save;
			return CaddyConfigSQLiteModel.findByIdAndUpdate(this.id, updateData, { new: true });
		};
		return createdConfig;
	},

	findAll({ limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM caddy_configs ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
		return rows.map(row => this._formatRow(row));
	},

	findById(id) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM caddy_configs WHERE id = ?').get(id);
		if (!row) return null;
		return this._formatRow(row);
	},

	find(query = {}) {
		const db = getDB();
		let sql = 'SELECT * FROM caddy_configs';
		const params = [];

		if (Object.keys(query).length > 0) {
			const conditions = [];
			Object.keys(query).forEach(key => {
				if (key === 'servers') {
					// For servers array query, we need to check if the server ID is in the JSON array
					conditions.push(`JSON_EXTRACT(servers, '$') LIKE ?`);
					params.push(`%"${query[key]}"%`);
				} else if (key === '_id' && query[key].$ne) {
					conditions.push(`id != ?`);
					params.push(query[key].$ne);
				} else if (key !== '_populate') {
					conditions.push(`${key} = ?`);
					params.push(query[key]);
				}
			});
			
			if (conditions.length > 0) {
				sql += ` WHERE ${conditions.join(' AND ')}`;
			}
		}

		sql += ' ORDER BY createdAt DESC';

		const rows = db.prepare(sql).all(...params);
		return rows.map(row => this._formatRow(row));
	},

	findByIdAndUpdate(id, updateData, options = {}) {
		const db = getDB();
		const existingConfig = this.findById(id);
		if (!existingConfig) return null;

		const updateFields = [];
		const updateValues = [];
		
		Object.keys(updateData).forEach(key => {
			if (key === 'servers' || key === 'jsonConfig' || key === 'metadata' || key === 'history') {
				updateFields.push(`${key} = ?`);
				updateValues.push(JSON.stringify(updateData[key]));
			} else if (typeof updateData[key] === 'object' && updateData[key] !== null) {
				// For other objects, stringify them
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

		const stmt = db.prepare(`UPDATE caddy_configs SET ${updateFields.join(', ')} WHERE id = ?`);
		stmt.run(...updateValues);

		return options.new ? this.findById(id) : existingConfig;
	},

	findByIdAndDelete(id) {
		const db = getDB();
		const config = this.findById(id);
		if (!config) return null;

		const stmt = db.prepare('DELETE FROM caddy_configs WHERE id = ?');
		stmt.run(id);
		return config;
	},

	// Mock populate support for compatibility
	populate(field, select) {
		return {
			sort: (sortObj) => {
				return this;
			},
			lean: () => {
				return this.find({});
			}
		};
	},

	_formatRow(row) {
		const formatted = {
			...row,
			_id: String(row.id), // Convert to string and add _id for Mongoose compatibility
			id: String(row.id), // Convert id to string for consistency
			servers: row.servers ? JSON.parse(row.servers) : [],
			jsonConfig: row.jsonConfig ? JSON.parse(row.jsonConfig) : {},
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			history: row.history ? JSON.parse(row.history) : [],
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
		};
		
		// Add save method for compatibility
		formatted.save = async function() {
			const updateData = { ...this };
			delete updateData.id;
			delete updateData._id;
			delete updateData.save;
			return CaddyConfigSQLiteModel.findByIdAndUpdate(this.id, updateData, { new: true });
		};
		
		return formatted;
	}
};

module.exports = CaddyConfigSQLiteModel;
