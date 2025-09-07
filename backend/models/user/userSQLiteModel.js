const bcrypt = require('bcryptjs');
const { getDB } = require('../../services/sqliteService');

// Ensure table exists
function ensureTable() {
	const db = getDB();
	// For tests, drop and recreate to ensure schema consistency
	if (process.env.NODE_ENV === 'test') {
		db.prepare('DROP TABLE IF EXISTS users').run();
	}
	
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
		return { 
			id: String(info.lastInsertRowid), 
			_id: String(info.lastInsertRowid), 
			...user, 
			password: undefined, 
			createdAt: now, 
			updatedAt: now 
		};
	},

	findAll({ limit = 100, offset = 0 } = {}) {
		const db = getDB();
		const rows = db.prepare('SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
		return rows.map(row => ({
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
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
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
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
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			password: undefined // Remove password unless specifically requested
		};
	},

	findByUsernameWithPassword(username) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
		if (!row) return null;
		return {
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			// Keep password for comparison
			password: row.password
		};
	},

	findByIdWithPassword(id) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
		if (!row) return null;
		return {
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			// Keep password for comparison
			password: row.password
		};
	},

	findByEmail(email) {
		const db = getDB();
		const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
		if (!row) return null;
		return {
			...row,
			_id: String(row.id), // Convert to string and add _id for MongoDB compatibility
			id: String(row.id), // Convert id to string for consistency
			isActive: !!row.isActive,
			lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
			password: undefined
		};
	},

	async findByIdAndUpdate(id, updateData, options = {}) {
		const db = getDB();
		const now = new Date().toISOString();
		
		// If password is being updated, hash it
		if (updateData.password) {
			const salt = await bcrypt.genSalt(10);
			updateData.password = await bcrypt.hash(updateData.password, salt);
		}

		const fields = [];
		const values = [];
		
		for (const [key, value] of Object.entries(updateData)) {
			if (key !== 'id') {
				fields.push(`${key} = ?`);
				values.push(value);
			}
		}
		
		// Always update updatedAt
		fields.push('updatedAt = ?');
		values.push(now);
		values.push(id);

		const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
		const result = stmt.run(...values);
		
		if (result.changes === 0) {
			return null;
		}
		
		// Return the updated user if requested
		if (options.returnUpdatedDoc || options.new) {
			return this.findById(id);
		}
		
		return { id, _id: id, ...updateData, updatedAt: new Date(now) };
	},

	findByIdAndDelete(id) {
		const db = getDB();
		const user = this.findById(id);
		if (!user) return null;
		
		const stmt = db.prepare('DELETE FROM users WHERE id = ?');
		const result = stmt.run(id);
		
		return result.changes > 0 ? user : null;
	},

	async updateLastLogin(id, lastLogin) {
		const db = getDB();
		const now = new Date().toISOString();
		const loginTime = lastLogin ? new Date(lastLogin).toISOString() : now;
		
		const stmt = db.prepare('UPDATE users SET lastLogin = ?, updatedAt = ? WHERE id = ?');
		const result = stmt.run(loginTime, now, id);
		
		return result.changes > 0;
	},

	async comparePassword(candidatePassword, hashedPassword) {
		return await bcrypt.compare(candidatePassword, hashedPassword);
	},

	// Instance-like methods for compatibility
	async saveUser(userObj) {
		if (userObj.id) {
			// Update existing user
			const updateData = { ...userObj };
			delete updateData.id;
			delete updateData.createdAt;
			return this.findByIdAndUpdate(userObj.id, updateData, { new: true });
		} else {
			// Create new user
			return this.create(userObj);
		}
	}
};

module.exports = UserSQLiteModel;
