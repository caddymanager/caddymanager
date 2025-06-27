const AWS = require("@aws-sdk/client-s3");
const config = require('../config/config');
const logger = require('../config/logger');

let s3Client;

// Initialize S3 client based on mode
if (config.mode === 'onprem') {
  s3Client = new AWS.S3({
    region: process.env.LOCALS3_REGION,
    credentials: {
      accessKeyId: process.env.LOCALS3_ACCESSKEYID,
      secretAccessKey: process.env.LOCALS3_SECRETACCESSKEY,
    },
    endpoint: process.env.LOCALS3_ENDPOINT,
  });
} else {
  s3Client = new AWS.S3({
    region: process.env.REMOTES3_REGION,
    credentials: {
      accessKeyId: process.env.REMOTES3_ACCESSKEYID,
      secretAccessKey: process.env.REMOTES3_SECRETACCESSKEY,
    },
    endpoint: process.env.REMOTES3_ENDPOINT,
  });
}

/**
 * Check S3 connectivity and bucket access
 * @returns {Promise<{healthy: boolean, error?: string, details?: object}>}
 */
const checkS3Health = async () => {
  try {
    const bucket = config.mode === 'onprem' ? process.env.LOCALS3_BUCKET : process.env.REMOTES3_BUCKET;
    
    // Test bucket access with headBucket command
    const headBucketCommand = new AWS.HeadBucketCommand({ Bucket: bucket });
    await s3Client.send(headBucketCommand);
    
    // Test list objects to verify read permissions
    const listCommand = new AWS.ListObjectsV2Command({ 
      Bucket: bucket, 
      MaxKeys: 1 
    });
    const listResult = await s3Client.send(listCommand);
    
    const details = {
      mode: config.mode,
      bucket: bucket,
      endpoint: config.mode === 'onprem' ? process.env.LOCALS3_ENDPOINT : process.env.REMOTES3_ENDPOINT,
      region: config.mode === 'onprem' ? process.env.LOCALS3_REGION : process.env.REMOTES3_REGION,
      objectCount: listResult.KeyCount || 0,
      canList: true,
      canAccess: true
    };
    
    logger.info('S3 health check passed', details);
    return { healthy: true, details };
    
  } catch (error) {
    const errorDetails = {
      mode: config.mode,
      bucket: config.mode === 'onprem' ? process.env.LOCALS3_BUCKET : process.env.REMOTES3_BUCKET,
      endpoint: config.mode === 'onprem' ? process.env.LOCALS3_ENDPOINT : process.env.REMOTES3_ENDPOINT,
      error: error.message,
      code: error.name
    };
    
    logger.error('S3 health check failed', errorDetails);
    return { 
      healthy: false, 
      error: error.message,
      details: errorDetails
    };
  }
};

/**
 * Perform a comprehensive S3 test including write operations
 * @returns {Promise<{healthy: boolean, error?: string, details?: object}>}
 */
const checkS3Comprehensive = async () => {
  try {
    const bucket = config.mode === 'onprem' ? process.env.LOCALS3_BUCKET : process.env.REMOTES3_BUCKET;
    const testKey = `health-check/test-${Date.now()}.txt`;
    const testContent = 'S3 health check test file';
    
    // Test write operation
    const putCommand = new AWS.PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    });
    await s3Client.send(putCommand);
    
    // Test read operation
    const getCommand = new AWS.GetObjectCommand({
      Bucket: bucket,
      Key: testKey
    });
    const getResult = await s3Client.send(getCommand);
    
    // Test delete operation
    const deleteCommand = new AWS.DeleteObjectCommand({
      Bucket: bucket,
      Key: testKey
    });
    await s3Client.send(deleteCommand);
    
    const details = {
      mode: config.mode,
      bucket: bucket,
      endpoint: config.mode === 'onprem' ? process.env.LOCALS3_ENDPOINT : process.env.REMOTES3_ENDPOINT,
      region: config.mode === 'onprem' ? process.env.LOCALS3_REGION : process.env.REMOTES3_REGION,
      canRead: true,
      canWrite: true,
      canDelete: true,
      testFileSize: getResult.ContentLength
    };
    
    logger.info('S3 comprehensive health check passed', details);
    return { healthy: true, details };
    
  } catch (error) {
    const errorDetails = {
      mode: config.mode,
      bucket: config.mode === 'onprem' ? process.env.LOCALS3_BUCKET : process.env.REMOTES3_BUCKET,
      endpoint: config.mode === 'onprem' ? process.env.LOCALS3_ENDPOINT : process.env.REMOTES3_ENDPOINT,
      error: error.message,
      code: error.name
    };
    
    logger.error('S3 comprehensive health check failed', errorDetails);
    return { 
      healthy: false, 
      error: error.message,
      details: errorDetails
    };
  }
};

module.exports = {
  checkS3Health,
  checkS3Comprehensive,
  s3Client
};
