// Dynamically select the correct audit log model based on DB_ENGINE
const dbEngine = process.env.DB_ENGINE || 'sqlite';
let AuditLogModel;

if (dbEngine === 'sqlite') {
	AuditLogModel = require('./auditLogSQLiteModel');
} else {
	AuditLogModel = require('./auditLogMongoModel');
}

module.exports = AuditLogModel;
