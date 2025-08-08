const axios = require('axios');
const CaddyServer = require('../models/caddyServers/caddyServersMongoModel');

// Environment variables
const PING_INTERVAL = process.env.PING_INTERVAL || 300000; // Default to 5 minutes (300000 ms) if not set
const PING_TIMEOUT = process.env.PING_TIMEOUT || 2000; // Default to 2 seconds (2000 ms) if not set

// Setup logging with timestamps
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    service: 'pingService',
    level,
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
};

let pingInterval = null;

/**
 * Ping a single Caddy server and update its status
 * @param {Object} server - Caddy server document from MongoDB
 * @returns {Promise<Object>} - Updated server status
 */
const pingServer = async (server) => {
  try {
    log('info', `Pinging server: ${server.name} (${server._id})`, {
      apiUrl: server.apiUrl,
      apiPort: server.apiPort
    });

    // Construct the URL to ping
    const url = `${server.apiUrl}${server.apiUrl.endsWith('/') ? '' : ':'}${server.apiPort}${server.adminApiPath}`;
    
    // Configure request options (no auth)
    const requestOptions = {
      timeout: parseInt(PING_TIMEOUT, 10), // Use timeout directly as milliseconds
      validateStatus: null, // Accept any status code as a response
    };

    log('debug', `Sending request to: ${url} with timeout: ${PING_TIMEOUT}ms`);
    // Send the ping request
    const response = await axios.get(url, requestOptions);
    
    // Update server status in the database
    const status = response.status >= 200 && response.status < 300 ? 'online' : 'offline';
    const now = new Date();
    
    log('info', `Server ${server.name} responded with status: ${response.status}`, {
      serverId: server._id,
      status: status,
      responseStatus: response.status,
      timestamp: now
    });

    await CaddyServer.findByIdAndUpdate(server._id, {
      status: status,
      lastPinged: now
    });
    
    log('debug', `Updated database status for ${server.name} to: ${status}`);
    
    return { 
      serverId: server._id, 
      name: server.name, 
      status: status, 
      lastPinged: now 
    };
  } catch (error) {
    // If there's an error reaching the server, mark it as offline
    const now = new Date();
    
    log('error', `Error pinging server ${server.name}: ${error.message}`, {
      serverId: server._id,
      error: error.message,
      errorStack: error.stack,
      timestamp: now
    });
    
    await CaddyServer.findByIdAndUpdate(server._id, {
      status: 'offline',
      lastPinged: now
    });
    
    log('debug', `Updated database status for ${server.name} to: offline (after error)`);
    
    return { 
      serverId: server._id, 
      name: server.name, 
      status: 'offline', 
      lastPinged: now,
      error: error.message 
    };
  }
};

/**
 * Ping all Caddy servers and update their status
 * @returns {Promise<Array>} - Array of server ping results
 */
const pingAllServers = async () => {
  try {
    log('info', 'Starting ping cycle for all servers');
    
    // Find all servers, regardless of active status
    const servers = await CaddyServer.find();
    
    if (!servers || servers.length === 0) {
      log('info', 'No Caddy servers found to ping');
      return [];
    }
    
    log('info', `Found ${servers.length} servers to ping`);
    
    // Ping all servers concurrently
    const pingPromises = servers.map(server => pingServer(server));
    const results = await Promise.all(pingPromises);
    
    // Count online and offline servers
    const onlineCount = results.filter(r => r.status === 'online').length;
    const offlineCount = results.filter(r => r.status === 'offline').length;
    
    log('info', `Ping cycle completed`, {
      serversPinged: results.length,
      online: onlineCount,
      offline: offlineCount
    });
    
    return results;
  } catch (error) {
    log('error', `Error in pingAllServers: ${error.message}`, {
      error: error.message,
      errorStack: error.stack
    });
    return [];
  }
};

/**
 * Start the ping service interval
 * @returns {Object} - Service status
 */
const startPingService = () => {
  if (pingInterval) {
    log('info', 'Ping service already running', { interval: PING_INTERVAL });
    return { status: 'already-running', interval: PING_INTERVAL };
  }
  
  // Use PING_INTERVAL directly as milliseconds
  const intervalMs = parseInt(PING_INTERVAL, 10);
  
  log('info', `Starting ping service`, {
    intervalMs,
    intervalSeconds: intervalMs/1000,
    timeoutMs: parseInt(PING_TIMEOUT, 10),
    timeoutSeconds: parseInt(PING_TIMEOUT, 10)/1000
  });
  
  // Start the interval
  pingInterval = setInterval(pingAllServers, intervalMs);
  
  // Run an initial ping immediately
  pingAllServers();
  
  log('info', `Ping service started successfully`, {
    intervalMs,
    intervalSeconds: intervalMs/1000
  });
  
  return { status: 'started', interval: intervalMs };
};

/**
 * Stop the ping service interval
 * @returns {Object} - Service status
 */
const stopPingService = () => {
  if (!pingInterval) {
    log('info', 'Ping service not running');
    return { status: 'not-running' };
  }
  
  clearInterval(pingInterval);
  pingInterval = null;
  
  log('info', 'Ping service stopped');
  return { status: 'stopped' };
};

/**
 * Get the current status of the ping service
 * @returns {Object} - Service status
 */
const getPingServiceStatus = () => {
  const status = {
    running: pingInterval !== null,
    interval: PING_INTERVAL,
    timeout: PING_TIMEOUT,
    intervalSeconds: parseInt(PING_INTERVAL, 10) / 1000,
    timeoutSeconds: parseInt(PING_TIMEOUT, 10) / 1000
  };
  
  log('debug', 'Ping service status requested', status);
  return status;
};

// Export service methods
module.exports = {
  startPingService,
  stopPingService,
  pingAllServers,
  pingServer,
  getPingServiceStatus
};