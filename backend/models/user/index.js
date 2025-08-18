// Dynamically select the correct User model based on DB_ENGINE
const dbEngine = process.env.DB_ENGINE || 'sqlite';
let UserModel;

if (dbEngine === 'sqlite') {
	UserModel = require('./userSQLiteModel');
} else {
	UserModel = require('./userMongoModel');
}

module.exports = UserModel;
