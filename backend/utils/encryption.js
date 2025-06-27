const crypto = require('crypto');

class Encryption {
    constructor(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        this.password = password;
    }

    encrypt(data) {
        const salt = crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(
            this.password,
            salt,
            100000,
            32,
            'sha512'
        );

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            encrypted: encrypted,
            authTag: authTag.toString('hex'),
            salt: salt.toString('hex')
        };
    }

    decrypt(encryptedData) {
        const key = crypto.pbkdf2Sync(
            this.password,
            Buffer.from(encryptedData.salt, 'hex'),
            100000,
            32,
            'sha512'
        );

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            key,
            Buffer.from(encryptedData.iv, 'hex')
        );

        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }
}

module.exports = { Encryption };