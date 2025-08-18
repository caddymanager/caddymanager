// Dynamically select the correct API key model based on DB_ENGINE
const dbEngine = process.env.DB_ENGINE || 'sqlite';
let ApiKeyModel;

try {
	if (dbEngine === 'sqlite') {
		ApiKeyModel = require('./apiKeySQLiteModel');
	} else {
		ApiKeyModel = require('./apiKeyMongoModel');
	}
} catch (error) {
	// If models fail to load (e.g., database not initialized), provide a stub
	console.warn('Warning: API Key model failed to load, using stub:', error.message);
	ApiKeyModel = {
		createApiKey: () => { throw new Error('Database not initialized'); },
		validateApiKey: () => { throw new Error('Database not initialized'); },
		findAll: () => { throw new Error('Database not initialized'); },
		findByUserId: () => { throw new Error('Database not initialized'); },
		findById: () => { throw new Error('Database not initialized'); },
		findOne: () => { throw new Error('Database not initialized'); },
		findByIdAndUpdate: () => { throw new Error('Database not initialized'); },
		findOneAndUpdate: () => { throw new Error('Database not initialized'); },
		findOneAndDelete: () => { throw new Error('Database not initialized'); },
		findByIdAndDelete: () => { throw new Error('Database not initialized'); },
		findAllWithUsers: () => { throw new Error('Database not initialized'); },
		find: () => ({ 
			select: () => ({ 
				sort: () => ({ 
					lean: () => { throw new Error('Database not initialized'); } 
				}) 
			}) 
		})
	};
}

module.exports = ApiKeyModel;
