const axios = require('axios');
const CaddyServer = require('../database/models/caddyServersModel');
const CaddyConfig = require('../database/models/caddyConfigModel');
require('dotenv').config();

/**
 * Service for interacting with the Caddy API
 */
class CaddyService {
  /**
   * Create a configured axios instance for a specific Caddy server
   * @param {Object} serverConfig - The server configuration
   * @returns {Object} - Configured axios instance
   */
  createAxiosInstance(serverConfig) {
    const baseURL = `${serverConfig.apiUrl}:${serverConfig.apiPort}`;
    
    const config = {
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000 // 10 seconds timeout
    };

    // No authentication logic

    return axios.create(config);
  }

  /**
   * Get all registered Caddy servers from the database
   * @returns {Promise<Array>} - Array of server objects
   */
  async getAllServers() {
    return await CaddyServer.find({});
  }

  /**
   * Add a new Caddy server to the database
   * @param {Object} serverData - Server configuration data
   * @returns {Promise<Object>} - Created server object
   */
  async addServer(serverData) {
    // Create new server instance
    const newServer = new CaddyServer(serverData);
    
    // Test connection before saving
    try {
      await this.testServerConnection(newServer);
      newServer.status = 'online';
      newServer.lastPinged = new Date();
    } catch (err) {
      newServer.status = 'offline';
    }
    
    return await newServer.save();
  }

  /**
   * Update a Caddy server in the database
   * @param {string} serverId - Server ID
   * @param {Object} updateData - Updated server data
   * @returns {Promise<Object>} - Updated server object
   */
  async updateServer(serverId, updateData) {
    return await CaddyServer.findByIdAndUpdate(
      serverId, 
      updateData, 
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete a Caddy server from the database
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteServer(serverId) {
    return await CaddyServer.findByIdAndDelete(serverId);
  }

  /**
   * Test connection to a Caddy server
   * @param {Object} serverConfig - Server configuration
   * @returns {Promise<Object>} - Response from the server
   */
  async testServerConnection(serverConfig) {
    const axiosInstance = this.createAxiosInstance(serverConfig);
    try {
      // Using the standard Caddy admin endpoint for config
      const response = await axiosInstance.get('/config/');
      return response.data;
    } catch (error) {
      console.error(`Error connecting to Caddy server: ${error.message}`);
      throw new Error(`Failed to connect to Caddy server: ${error.message}`);
    }
  }

  /**
   * Get the config from a specific Caddy server
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} - Caddy configuration
   */
  async getConfig(serverId) {
    const server = await CaddyServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    const axiosInstance = this.createAxiosInstance(server);
    try {
      const response = await axiosInstance.get(server.adminApiPath);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching Caddy config: ${error.message}`);
    }
  }

  /**
   * Update the Caddy configuration on a server
   * @param {string} serverId - Server ID
   * @param {Object} configData - New configuration data
   * @returns {Promise<Object>} - Response from the server
   */
  async updateConfig(serverId, configData) {
    const server = await CaddyServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    const axiosInstance = this.createAxiosInstance(server);
    try {
      const response = await axiosInstance.post(server.adminApiPath, configData);
      return response.data;
    } catch (error) {
      throw new Error(`Error updating Caddy config: ${error.message}`);
    }
  }
  
  /**
   * Load config from a JSON file to a Caddy server
   * @param {string} serverId - Server ID
   * @param {Object} configJson - JSON configuration
   * @returns {Promise<Object>} - Response from the server
   */
  async loadConfig(serverId, configJson) {
    return await this.updateConfig(serverId, configJson);
  }
  
  /**
   * Check the status of all registered Caddy servers
   * @returns {Promise<Object>} - Status results
   */
  async checkAllServersStatus() {
    const servers = await CaddyServer.find({});
    const results = {
      total: servers.length,
      online: 0,
      offline: 0,
      unknown: 0,
      details: []
    };
    
    for (const server of servers) {
      try {
        await this.testServerConnection(server);
        server.status = 'online';
        server.lastPinged = new Date();
        results.online++;
        results.details.push({
          id: server._id,
          name: server.name,
          status: 'online',
          lastPinged: server.lastPinged
        });
      } catch (err) {
        server.status = 'offline';
        server.lastPinged = new Date();
        results.offline++;
        results.details.push({
          id: server._id,
          name: server.name,
          status: 'offline',
          error: err.message,
          lastPinged: server.lastPinged
        });
      }
      await server.save();
    }
    
    return results;
  }

  /**
   * Get a specific Caddy server by ID
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} - Server object
   */
  async getServerById(serverId) {
    return await CaddyServer.findById(serverId);
  }

  /**
   * Generates a bash command that can be used to start Caddy with the appropriate admin API settings
   * @param {Object} serverConfig - Server configuration
   * @returns {string} - The command to run
   */
  
  // THIS NEEDS TO BE REWORKED
  generateCaddyStartCommand(serverConfig) {
    let command = 'caddy run';
    
    if (serverConfig.configFilePath) {
      command += ` --config ${serverConfig.configFilePath}`;
    }
    
    command += ` --admin ${serverConfig.apiUrl.replace(/^https?:\/\//, '')}:${serverConfig.apiPort}`;
    
    return command;
  }

  /**
   * Generates a Docker Compose file for a Caddy server (no authentication support)
   * @param {Object} serverConfig - Server configuration
   * @returns {string} - Docker Compose file content
   */

  // THIS NEEDS TO BE REWORKED
  generateDockerComposeFile(serverConfig) {
    return `version: "3.9"

services:
  caddy:
    image: caddy:2.7.5
    restart: unless-stopped
    entrypoint: >
      sh -c "
        # Configure the Caddy admin API before startup
        echo '{\n          admin 0.0.0.0:${serverConfig.apiPort}\n        }' > /etc/caddy/admin-conf.json &&
        # Start Caddy with the JSON config mounted as volume
        caddy run"
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
      - "${serverConfig.apiPort}:${serverConfig.apiPort}"
    volumes:
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
`;
  }
  
  /**
   * Extract configured sites from Caddy config
   * @param {Object} configData - Caddy configuration data
   * @returns {Array} - List of configured sites
   */
  extractConfiguredSites(configData) {
    try {
      const sites = [];
      const servers = configData?.apps?.http?.servers || {};
      
      for (const [serverName, serverConfig] of Object.entries(servers)) {
        if (serverName !== 'admin') {
          const addresses = serverConfig.listen || [];
          const routes = serverConfig.routes || [];
          
          for (const route of routes) {
            if (route.match && route.match.length > 0) {
              for (const match of route.match) {
                if (match.host && match.host.length > 0) {
                  sites.push(...match.host);
                }
              }
            }
          }
        }
      }
      
      return sites.length > 0 ? sites : ['No specific sites found'];
    } catch (error) {
      console.error('Error extracting sites:', error);
      return ['Error extracting site information'];
    }
  }

  /**
   * Add a new configuration to the database
   * @param {Object} configData - Configuration data including servers, name, and content
   * @returns {Promise<Object>} - Created configuration object
   */
  async addConfig(configData) {
    // Validate required fields
    if (!configData.name) {
      throw new Error('Configuration name is required');
    }
    
    if (!configData.jsonConfig) {
      throw new Error('JSON configuration content is required');
    }
    
    // Ensure servers is always an array
    if (!configData.servers || !Array.isArray(configData.servers)) {
      if (configData.server) {
        // Use single server if provided (backwards compatibility)
        configData.servers = [configData.server];
      } else {
        // Allow configurations without servers (standalone configurations)
        configData.servers = [];
      }
    }
    
    // If servers are specified, validate that they exist
    if (configData.servers.length > 0) {
      for (const serverId of configData.servers) {
        const serverExists = await CaddyServer.exists({ _id: serverId });
        if (!serverExists) {
          throw new Error(`Server with ID ${serverId} does not exist`);
        }
      }
    }
    
    // Always use json format
    configData.format = 'json';
    
    // Set default status if not provided
    if (!configData.status) {
      configData.status = 'draft';
    }
    
    // Add history entry if not provided
    if (!configData.history || configData.history.length === 0) {
      configData.history = [{
        action: 'created',
        timestamp: new Date(),
        notes: configData.metadata?.description || 'Created via API'
      }];
    }
    
    // Create and save the new configuration
    const newConfig = new CaddyConfig(configData);
    return await newConfig.save();
  }

  /**
   * Save a configuration to the database
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} - Saved configuration
   */
  async saveConfig(configData) {
    // Ensure servers is always an array
    if (!configData.servers || !Array.isArray(configData.servers)) {
      configData.servers = configData.server ? [configData.server] : [];
    }

    // Force format to json
    configData.format = 'json';

    // Create a new config
    const newConfig = new CaddyConfig(configData);
    return await newConfig.save();
  }

  /**
   * Get all configurations for a server
   * @param {string} serverId - Server ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - Array of configurations
   */
  async getConfigs(serverId, options = {}) {
    // Update query to use the servers array instead of the deprecated server field
    const query = { servers: serverId };
    
    // Always use JSON format
    query.format = 'json';
    
    // Add status filter if specified
    if (options.status) {
      query.status = options.status;
    }
    
    return await CaddyConfig.find(query).sort({ createdAt: -1 });
  }
  
  /**
   * Get a specific configuration by ID
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} - Configuration object
   */
  async getConfigById(configId) {
    return await CaddyConfig.findById(configId);
  }
  
  /**
   * Get the JSON configuration from a Caddy server and store it
   * @param {string} serverId - Server ID
   * @param {Object} options - Optional parameters
   * @returns {Promise<Object>} - JSON configuration
   */
  async getJsonConfig(serverId, options = {}) {
    const server = await CaddyServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    const axiosInstance = this.createAxiosInstance(server);
    try {
      const response = await axiosInstance.get(server.adminApiPath);
      
      // Save as a new configuration if skipSaveConfig is not true
      if (!options.skipSaveConfig) {
        const configName = options.name || options.configName || `${server.name} Config - ${new Date().toLocaleString()}`;
        const newConfig = await this.saveConfig({
          servers: [serverId],
          name: configName,
          format: 'json',
          jsonConfig: response.data,
          status: 'live',
          metadata: {
            description: options.description || 'Retrieved from server',
            version: options.version || '1.0',
            tags: options.tags || ['auto-retrieved']
          },
          history: [{
            action: 'created',
            notes: 'Automatically retrieved from server'
          }]
        });
        
        // Update the server to point to this config as active if needed
        if (options.setAsActive !== false) {
          server.activeConfig = newConfig._id;
          await server.save();
        }
        
        // Return both the config object and the raw JSON data
        return {
          config: newConfig,
          raw: response.data
        };
      }
      
      // If skipSaveConfig is true, just return the raw data
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching Caddy JSON config: ${error.message}`);
    }
  }

  /**
   * Apply a stored configuration to one or more servers
   * @param {string} configId - Configuration ID
   * @param {Array} serverIds - Optional array of server IDs (if not provided, uses all servers in the config)
   * @returns {Promise<Object>} - Result of the operation
   */
  async applyConfigToServer(configId, serverIds = null) {
    const config = await CaddyConfig.findById(configId);
    if (!config) {
      throw new Error('Configuration not found');
    }
    
    // Determine which servers to apply the configuration to
    const targetServerIds = serverIds || config.servers || [];
    
    if (targetServerIds.length === 0) {
      throw new Error('No target servers found for this configuration');
    }
    
    const results = {
      success: true,
      message: `Configuration "${config.name}" applied to servers`,
      servers: [],
      failed: [],
      serversApplied: [] // Track servers the config was applied to
    };
    
    // Log config data for debugging
    console.log(`Applying configuration ${config.name} (${config._id}) to ${targetServerIds.length} servers`);
    
    // Apply to each server
    for (const serverId of targetServerIds) {
      try {
        const server = await CaddyServer.findById(serverId);
        if (!server) {
          results.failed.push({
            serverId,
            error: 'Server not found'
          });
          continue;
        }
        
        console.log(`Applying to server ${server.name} (${server._id}) at ${server.apiUrl}:${server.apiPort}${server.adminApiPath}`);
        
        // First, validate the configuration against this server
        try {
          console.log(`Validating configuration on ${server.name} before applying...`);
          const validationResult = await this.validateConfig(server, config.jsonConfig);
          
          if (!validationResult.isValid) {
            console.error(`Configuration validation failed for server ${server.name}:`, validationResult.message);
            results.failed.push({
              serverId,
              name: server.name,
              error: `Configuration validation failed: ${validationResult.message}`
            });
            continue;
          }
          
          console.log(`Configuration validated successfully on ${server.name}`);
        } catch (validationError) {
          console.error(`Error during validation for server ${server.name}:`, validationError.message);
          results.failed.push({
            serverId,
            name: server.name,
            error: `Validation error: ${validationError.message}`
          });
          continue;
        }
        
        const axiosInstance = this.createAxiosInstance(server);
        
        // Apply JSON config using the server's configured adminApiPath
        const result = await axiosInstance.post(server.adminApiPath, config.jsonConfig);
        
        console.log(`Successfully applied config to ${server.name}`, result.status);
        
        // Update the status of all other configs for this server to non-live
        await this.updateOtherConfigurations(serverId, configId);
        
        // Set this config's status to live
        config.status = 'live';
        
        // Add history entry
        if (!config.history) {
          config.history = [];
        }
        
        config.history.push({
          action: 'deployed',
          timestamp: new Date(),
          server: serverId,
          notes: `Configuration deployed to server: ${server.name}`
        });
        
        // Update the server to point to this config as active
        server.activeConfig = config._id;
        await server.save();
        
        // Track this server ID for response
        results.serversApplied.push(serverId);
        
        // Record the success
        results.servers.push({
          serverId,
          name: server.name,
          status: 'success'
        });
      } catch (error) {
        console.error(`Failed to apply config to server ${serverId}:`, error.message);
        results.failed.push({
          serverId,
          error: error.message
        });
      }
    }
    
    // Save the config with updated status only if at least one server succeeded
    if (results.servers.length > 0) {
      await config.save();
    }
    
    // Update overall success flag - only consider it a success if ALL servers succeeded
    results.success = results.failed.length === 0 && results.servers.length > 0;
    
    if (results.failed.length > 0) {
      if (results.servers.length > 0) {
        results.message = `Configuration "${config.name}" partially applied. ${results.servers.length} succeeded, ${results.failed.length} failed.`;
      } else {
        results.message = `Configuration "${config.name}" failed to apply to any server. ${results.failed.length} servers failed.`;
      }
    } else if (results.servers.length > 0) {
      results.message = `Configuration "${config.name}" successfully applied to ${results.servers.length} server(s).`;
    } else {
      results.message = `No servers were updated with configuration "${config.name}".`;
      results.success = false;
    }
    
    return results;
  }
  
  /**
   * Update status of other configurations for a server
   * @param {string} serverId - The server ID
   * @param {string} activeConfigId - The active config ID (to be excluded from update)
   * @returns {Promise<void>} 
   */
  async updateOtherConfigurations(serverId, activeConfigId) {
    // Find all configurations that reference this server
    const configs = await CaddyConfig.find({
      servers: serverId,
      _id: { $ne: activeConfigId },
      status: 'live'
    });
    
    console.log(`Found ${configs.length} other live configurations for server ${serverId}`);
    
    // Update their status to 'draft'
    for (const config of configs) {
      config.status = 'draft';
      
      // Add history entry
      if (!config.history) {
        config.history = [];
      }
      
      config.history.push({
        action: 'superseded',
        timestamp: new Date(),
        server: serverId,
        notes: `Configuration superseded by another configuration`
      });
      
      await config.save();
    }
  }

  /**
   * Retrieve a file from a server's filesystem
   * @param {string} serverId - Server ID  
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} - The file content
   */
  async retrieveFileFromServer(serverId, filePath) {
    const server = await CaddyServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    const axiosInstance = this.createAxiosInstance(server);
    try {
      const encodedPath = encodeURIComponent(filePath);
      return await axiosInstance.get(`/load/file?filename=${encodedPath}`);
    } catch (error) {
      throw new Error(`Error retrieving file from server: ${error.message}`);
    }
  }

  /**
   * Get all configurations from the database
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - Array of configurations
   */
  async getAllConfigs(options = {}) {
    const query = { format: 'json' };
    
    // Add status filter if specified
    if (options.status) {
      query.status = options.status;
    }
    
    // Add server filter if specified using servers array
    if (options.server) {
      query.servers = options.server;
    }
    
    return await CaddyConfig.find(query)
      .populate('servers', 'name') // Populate servers with their names
      .sort({ createdAt: -1 });
  }

  /**
   * Fetch and store the current configuration from a server
   * @param {string} serverId - Server ID
   * @param {Object} options - Optional parameters
   * @returns {Promise<Object>} - The stored configuration
   */
  async fetchAndStoreCurrentConfig(serverId, options = {}) {
    const server = await CaddyServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    try {
      // Get JSON config 
      const jsonConfig = await this.getJsonConfig(serverId, {
        configName: options.configName || `${server.name} - Config`,
        description: options.description || 'Pulled during server creation',
        skipSaveConfig: false,
        tags: options.tags || ['initial-import']
      });
      
      return {
        success: true,
        jsonConfig,
        message: 'JSON configuration retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve configuration: ${error.message}`);
    }
  }

  /**
   * Check the status of a specific Caddy server by ID
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} - Server status info
   */
  async checkServerStatus(serverId) {
    const server = await CaddyServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    try {
      await this.testServerConnection(server);
      
      // Update server status in database
      const now = new Date();
      server.status = 'online';
      server.lastPinged = now;
      await server.save();
      
      return {
        id: server._id,
        name: server.name,
        status: 'online',
        lastPinged: now
      };
    } catch (err) {
      // Update server status in database
      const now = new Date();
      server.status = 'offline';
      server.lastPinged = now;
      await server.save();
      
      return {
        id: server._id,
        name: server.name,
        status: 'offline',
        error: err.message,
        lastPinged: now
      };
    }
  }

  /**
   * Delete a configuration by ID
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} - Deleted configuration
   */
  async deleteConfig(configId) {
    try {
      const config = await CaddyConfig.findById(configId);
      
      // Check if config exists
      if (!config) {
        return null;
      }
      
      // Find all servers using this config as their active config
      const serversUsingThisConfig = await CaddyServer.find({
        activeConfig: configId
      });
      
      // Update each server to remove this as active config
      for (const server of serversUsingThisConfig) {
        server.activeConfig = null;
        await server.save();
      }
      
      // Delete the config
      const deletedConfig = await CaddyConfig.findByIdAndDelete(configId);
      return deletedConfig;
    } catch (error) {
      throw new Error(`Error deleting configuration: ${error.message}`);
    }
  }

  /**
   * Update a configuration's metadata (name, description, tags, etc.)
   * @param {string} configId - Configuration ID
   * @param {Object} updateData - Updated configuration data
   * @returns {Promise<Object|null>} - Updated configuration or null if not found
   */
  async updateConfigMetadata(configId, updateData) {
    try {
      // Get the original document
      const config = await CaddyConfig.findById(configId);
      if (!config) return null;
      
      // Update only the allowed metadata fields
      const allowedFields = ['name', 'status', 'metadata', 'format'];
      const cleanUpdateData = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          // For metadata, merge rather than replace
          if (field === 'metadata' && updateData.metadata) {
            cleanUpdateData.metadata = {
              ...config.metadata,
              ...updateData.metadata
            };
          } else {
            cleanUpdateData[field] = updateData[field];
          }
        }
      }
      
      // Add history entry for this update
      if (!config.history) {
        config.history = [];
      }
      
      config.history.push({
        action: 'updated',
        timestamp: new Date(),
        notes: 'Metadata updated via API'
      });
      
      // Apply all updates
      Object.assign(config, cleanUpdateData);
      
      // Save and return the updated document
      return await config.save();
    } catch (error) {
      console.error(`Error updating configuration metadata: ${error.message}`);
      throw new Error(`Failed to update configuration metadata: ${error.message}`);
    }
  }

  /**
   * Update a configuration's content (JSON data)
   * @param {string} configId - Configuration ID
   * @param {Object} contentData - Updated content data
   * @returns {Promise<Object|null>} - Updated configuration or null if not found
   */
  async updateConfigContent(configId, contentData) {
    try {
      // Get the original document
      const config = await CaddyConfig.findById(configId);
      if (!config) return null;
      
      // Update the JSON content
      if (contentData.content) {
        config.jsonConfig = contentData.content;
      } else if (contentData.jsonConfig) {
        config.jsonConfig = contentData.jsonConfig;
      } else {
        throw new Error('No valid content provided for update');
      }
      
      // Set status back to draft when content is modified
      config.status = 'draft';
      
      // Add history entry for this update
      if (!config.history) {
        config.history = [];
      }
      
      config.history.push({
        action: 'content-updated',
        timestamp: new Date(),
        notes: 'Content updated via API'
      });
      
      // Save and return the updated document
      return await config.save();
    } catch (error) {
      console.error(`Error updating configuration content: ${error.message}`);
      throw new Error(`Failed to update configuration content: ${error.message}`);
    }
  }

  /**
   * Validate a Caddy configuration without applying it
   * @param {Object} serverConfig - Server configuration
   * @param {Object} configContent - Configuration content to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateConfig(serverConfig, configContent) {
    // First, check for common errors in the configuration
    try {
      const validationIssues = this.checkConfigurationForCommonIssues(configContent);
      
      if (validationIssues.hasErrors) {
        return {
          isValid: false,
          message: `Configuration contains errors: ${validationIssues.errors.join('; ')}`,
          errors: validationIssues.errors
        };
      }
      
      if (validationIssues.hasWarnings) {
        console.log(`Configuration has warnings: ${validationIssues.warnings.join('; ')}`);
      }
    } catch (validationError) {
      console.error('Error during local validation checks:', validationError);
    }
    
    // Now proceed with server-side validation
    const axiosInstance = this.createAxiosInstance(serverConfig);
    
    try {
      // First check if the server has a /load/config endpoint with validate_only parameter
      // This is the standard way to validate in newer Caddy versions
      try {
        console.log(`Trying modern validation endpoint on server ${serverConfig.name}...`);
        const response = await axiosInstance.post('/load/config?validate_only=1', configContent);
        return {
          isValid: true,
          message: 'Configuration is valid',
          data: response.data
        };
      } catch (modernValidationError) {
        // If this fails, try the fallback method of validating against /config/
        console.log(`Modern validation failed, falling back to basic validation...`);
        
        // We'll do a simple GET to ensure the server is reachable
        await axiosInstance.get(serverConfig.adminApiPath);
        
        // No validation endpoint available, we'll just have to trust the config is valid
        // We might add more validation logic here in the future
        return {
          isValid: true,
          message: 'Server connection successful, but validation endpoint not available',
          data: null
        };
      }
    } catch (error) {
      // If an error occurs, the configuration is invalid or the server is unreachable
      let errorMsg = 'Configuration validation failed';
      if (error.response && error.response.data) {
        errorMsg = error.response.data.error || error.message;
      } else {
        errorMsg = error.message;
      }
      
      return {
        isValid: false,
        message: errorMsg,
        error: error.response?.data || error.message
      };
    }
  }
  
  /**
   * Check configuration for common issues before sending to server
   * @param {Object} configContent - Configuration content to check
   * @returns {Object} - Validation results with errors and warnings
   */
  checkConfigurationForCommonIssues(configContent) {
    const result = {
      hasErrors: false,
      hasWarnings: false,
      errors: [],
      warnings: []
    };
    
    try {
      // Check if there are HTTP servers defined
      if (!configContent?.apps?.http?.servers) {
        result.errors.push('Configuration does not contain any HTTP servers');
        result.hasErrors = true;
        return result;
      }
      
      const servers = configContent.apps.http.servers;
      
      // Check for port conflicts
      const portMap = new Map();
      for (const [serverName, serverConfig] of Object.entries(servers)) {
        if (!serverConfig.listen || !Array.isArray(serverConfig.listen)) {
          continue;
        }
        
        for (const listenAddr of serverConfig.listen) {
          const portMatch = listenAddr.match(/:(\d+)$/);
          if (portMatch) {
            const port = portMatch[1];
            
            if (portMap.has(port)) {
              // Check if hosts are specified to prevent conflict
              if (!this.hasHostSpecificRoutes(serverConfig) || 
                  !this.hasHostSpecificRoutes(servers[portMap.get(port)])) {
                result.errors.push(`Port conflict: Multiple servers (${portMap.get(port)} and ${serverName}) listening on port ${port} without host-specific routes`);
                result.hasErrors = true;
              }
            }
            portMap.set(port, serverName);
          }
        }
        
        // Check for load balancer issues
        if (serverConfig.routes && Array.isArray(serverConfig.routes)) {
          for (let routeIndex = 0; routeIndex < serverConfig.routes.length; routeIndex++) {
            const route = serverConfig.routes[routeIndex];
            if (route.handle && Array.isArray(route.handle)) {
              for (let handlerIndex = 0; handlerIndex < route.handle.length; handlerIndex++) {
                const handler = route.handle[handlerIndex];
                if (handler.handler === 'reverse_proxy') {
                  // 1. Check for lb_policy (incorrect) field
                  if (handler.lb_policy) {
                    result.warnings.push(`Handler ${handlerIndex} in route ${routeIndex} of server "${serverName}" uses "lb_policy" which is not valid in JSON format. Use "load_balancing: { selection_policy: { policy: "${handler.lb_policy}" } }" instead.`);
                    result.hasWarnings = true;
                  }
                  
                  // 2. Check for string value in selection_policy (should be object)
                  if (handler.load_balancing && handler.load_balancing.selection_policy && 
                      typeof handler.load_balancing.selection_policy === 'string') {
                    result.warnings.push(`Handler ${handlerIndex} in route ${routeIndex} of server "${serverName}" has incorrect format for selection_policy - should be an object with "policy" field. Change from "selection_policy": "${handler.load_balancing.selection_policy}" to "selection_policy": { "policy": "${handler.load_balancing.selection_policy}" }`);
                    result.hasWarnings = true;
                  }
                }
              }
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      result.errors.push(`Error validating configuration: ${error.message}`);
      result.hasErrors = true;
      return result;
    }
  }
  
  /**
   * Check if a server config has host-specific routes
   * @param {Object} serverConfig - Server configuration object
   * @returns {boolean} - True if server has host-specific routes
   */
  hasHostSpecificRoutes(serverConfig) {
    if (!serverConfig.routes || !Array.isArray(serverConfig.routes)) {
      return false;
    }
    
    for (const route of serverConfig.routes) {
      if (route.match && Array.isArray(route.match)) {
        for (const match of route.match) {
          if (match.host && Array.isArray(match.host) && match.host.length > 0) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

module.exports = new CaddyService();