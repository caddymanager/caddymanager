const axios = require('axios');
const caddyService = require('./caddyService');
const auditService = require('./auditService');
require('dotenv').config();

/**
 * Conversion Service - Handles conversion between Caddyfile and JSON formats
 */
const convertService = {
  /**
   * Convert Caddyfile content to JSON configuration
   * @param {string} caddyfile - Caddyfile content to convert
   * @param {string} serverId - Optional server ID to use for conversion
   * @returns {Promise<Object>} - The converted JSON configuration
   */
  async caddyfileToJson(caddyfile, serverId = null) {
    try {
      let serverUrl;
      
      if (serverId) {
        // If a server ID is provided, use that server's API for conversion
        const server = await caddyService.getServerById(serverId);
        if (!server) {
          throw new Error(`Server with ID ${serverId} not found`);
        }
        serverUrl = `${server.apiUrl}:${server.apiPort}`;
      } else {
        // Otherwise use the dedicated Caddy sandbox server from environment
        serverUrl = process.env.CADDY_SANDBOX_URL || 'http://localhost:2019';
      }
      
      // Ensure caddyfile is a string
      const caddyfileContent = typeof caddyfile === 'string' ? caddyfile : 
                              (caddyfile && typeof caddyfile === 'object' ? JSON.stringify(caddyfile) : String(caddyfile));
      
      // Make request to Caddy's adapt endpoint to convert Caddyfile to JSON
      const response = await axios.post(
        `${serverUrl}/adapt`, 
        caddyfileContent, 
        {
          params: {
            pretty: true
          },
          headers: {
            'Content-Type': 'text/caddyfile'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error in caddyfileToJson conversion:', error);
      
      // Extract the detailed error message from Caddy API response if available
      let errorMessage = 'Failed to convert Caddyfile to JSON';
      
      if (error.response?.data?.error) {
        // This captures Caddy's specific error messages
        errorMessage = `${errorMessage}: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      // Special handling for common errors
      if (errorMessage.includes('unrecognized global option') || 
          errorMessage.includes('module not registered') ||
          errorMessage.includes('unknown directive')) {
        // These errors likely indicate the Caddy instance doesn't have required modules
        errorMessage += "\n\nThis appears to be related to missing Caddy modules. " +
          "The target Caddy server may need to be compiled with additional plugins to support this Caddyfile.";
      } else if (errorMessage.includes('env.')) {
        // Handle environment variable errors more gracefully
        errorMessage = "Warning: Environment variables in your Caddyfile (like {env.VARIABLE}) " +
          "can't be resolved during conversion, but they will work when deployed if properly set on the server.";
      }
      
      throw new Error(errorMessage);
    }
  }
};

module.exports = convertService;