const caddyService = require('../services/caddyService');
const caddyServersRepository = require('../repositories/caddyServersRepository');
const auditService = require('../services/auditService');

/**
 * Caddy Controller - Handles all HTTP requests related to Caddy servers
 */
const caddyController = {
  /**
   * Get all registered Caddy servers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllServers: async (req, res) => {
    try {
      const servers = await caddyService.getAllServers();
      res.status(200).json({
        success: true,
        count: servers.length,
        data: servers
      });
    } catch (error) {
      console.error('Error fetching servers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching Caddy servers',
        error: error.message
      });
    }
  },

  /**
   * Get a specific Caddy server by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getServerById: async (req, res) => {
    try {
      const serverId = req.params.id;
      const server = await caddyService.getServerById(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Caddy server not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: server
      });
    } catch (error) {
      console.error('Error fetching server:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching Caddy server',
        error: error.message
      });
    }
  },

  /**
   * Add a new Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  addServer: async (req, res) => {
    try {
      const serverData = req.body;
      const pullExistingConfig = req.body.pullExistingConfig === true;
      
      // Remove flags that shouldn't be saved to database
      delete serverData.pullExistingConfig;
      
      // Test connection if this is an existing server or if explicitly requested
      if (pullExistingConfig) {
        try {
          await caddyService.testServerConnection(serverData);
        } catch (connectionError) {
          return res.status(400).json({
            success: false,
            message: 'Failed to connect to Caddy server',
            error: connectionError.message
          });
        }
      }
      
      // Add the server to our database
      const newServer = await caddyService.addServer(serverData);
      
      // Log the server addition to audit log
      await auditService.logAction({
        action: 'add_server',
        user: req.user,
        resourceType: 'server',
        resourceId: newServer._id,
        details: {
          name: newServer.name,
          url: newServer.apiUrl,
          port: newServer.apiPort
        },
        statusCode: 201,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // If pullExistingConfig is true, fetch and store the current configuration
      if (pullExistingConfig) {
        try {
          await caddyService.fetchAndStoreCurrentConfig(newServer._id, {
            configName: `${newServer.name} - Initial Config`,
            description: 'Pulled from server during creation'
          });
          
          return res.status(201).json({
            success: true,
            message: 'Caddy server added and existing configuration pulled successfully',
            data: newServer
          });
        } catch (configError) {
          // Log the error but don't fail the server creation
          console.error(`Failed to pull existing config: ${configError.message}`);
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Caddy server added successfully',
        data: newServer
      });
    } catch (error) {
      console.error('Error adding server:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding Caddy server',
        error: error.message
      });
    }
  },

  /**
   * Update an existing Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateServer: async (req, res) => {
    try {
      const serverId = req.params.id;
      const updateData = req.body;
      
      const updatedServer = await caddyService.updateServer(serverId, updateData);
      
      if (!updatedServer) {
        return res.status(404).json({
          success: false,
          message: 'Caddy server not found'
        });
      }

      // Log the server update to audit log
      await auditService.logAction({
        action: 'update_server',
        user: req.user,
        resourceType: 'server',
        resourceId: updatedServer._id,
        details: {
          name: updatedServer.name,
          updates: updateData
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Caddy server updated successfully',
        data: updatedServer
      });
    } catch (error) {
      console.error('Error updating server:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating Caddy server',
        error: error.message
      });
    }
  },

  /**
   * Delete a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  deleteServer: async (req, res) => {
    try {
      const serverId = req.params.id;
      const deletedServer = await caddyService.deleteServer(serverId);
      
      if (!deletedServer) {
        return res.status(404).json({
          success: false,
          message: 'Caddy server not found'
        });
      }

      // Log the server deletion to audit log
      await auditService.logAction({
        action: 'delete_server',
        user: req.user,
        resourceType: 'server',
        resourceId: serverId,
        details: {
          name: deletedServer.name,
          url: deletedServer.apiUrl
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Caddy server deleted successfully',
        data: deletedServer
      });
    } catch (error) {
      console.error('Error deleting server:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting Caddy server',
        error: error.message
      });
    }
  },

  /**
   * Test connection to a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  testConnection: async (req, res) => {
    try {
      const serverConfig = req.body;
      const result = await caddyService.testServerConnection(serverConfig);
      
      res.status(200).json({
        success: true,
        message: 'Connection successful',
        data: result
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: error.message
      });
    }
  },

  /**
   * Get configuration from a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getConfig: async (req, res) => {
    try {
      const serverId = req.params.id;
      const config = await caddyService.getConfig(serverId);
      
      res.status(200).json({
        success: true,
        message: 'Configuration retrieved successfully',
        data: config
      });
    } catch (error) {
      console.error('Error retrieving configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving Caddy configuration',
        error: error.message
      });
    }
  },

  /**
   * Update configuration on a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateConfig: async (req, res) => {
    try {
      const serverId = req.params.id;
      const configData = req.body;
      
      const result = await caddyService.updateConfig(serverId, configData);
      
      // Log the configuration update to audit log
      await auditService.logAction({
        action: 'update_server_config',
        user: req.user,
        resourceType: 'config',
        resourceId: serverId,
        details: {
          server: serverId,
          configChanged: true
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating Caddy configuration',
        error: error.message
      });
    }
  },

  /**
   * Load configuration from JSON to a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  loadConfig: async (req, res) => {
    try {
      const serverId = req.params.id;
      const configJson = req.body;
      
      const result = await caddyService.loadConfig(serverId, configJson);
      
      // Log the configuration loading to audit log
      await auditService.logAction({
        action: 'load_server_config',
        user: req.user,
        resourceType: 'config',
        resourceId: serverId,
        details: {
          server: serverId,
          configType: 'json'
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Configuration loaded successfully',
        data: result
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error loading Caddy configuration',
        error: error.message
      });
    }
  },

  /**
   * Check status of all registered Caddy servers
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async checkAllServersStatus(req, res) {
    try {
      const results = await caddyService.checkAllServersStatus();
      
      // Enhance server details with additional information needed by the frontend
      if (Array.isArray(results.details)) {
        const enhancedDetails = [];
        
        for (const detail of results.details) {
          // Fetch the full server data to get latest timestamps
          const serverData = await caddyServersRepository.findById(detail.id);
          if (serverData) {
            enhancedDetails.push({
              ...detail,
              lastPinged: serverData.lastPinged || null,
              updatedAt: serverData.updatedAt || null,
              active: serverData.active
            });
          } else {
            enhancedDetails.push(detail);
          }
        }
        
        results.details = enhancedDetails;
      }
      
      res.status(200).json({
        success: true,
        message: 'Status check completed successfully',
        data: results
      });
    } catch (error) {
      console.error('Error checking server status:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking Caddy servers status',
        error: error.message
      });
    }
  },

  /**
   * Check status of a specific Caddy server
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async checkServerStatus(req, res) {
    try {
      const { id } = req.params;
      
      // Get server status
      const statusResult = await caddyService.checkServerStatus(id);
      
      // Get complete server data to include all necessary fields for the frontend
      const server = await caddyServersRepository.findById(id);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Server not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Server status checked successfully',
        data: {
          serverId: id,
          connectionInfo: {
            status: statusResult.status,
            lastChecked: statusResult.lastPinged || server.lastPinged || new Date(),
            error: statusResult.error
          },
          serverData: server
        }
      });
    } catch (error) {
      console.error(`Error checking server ${req.params.id} status:`, error);
      res.status(500).json({
        success: false,
        message: 'Error checking server status',
        error: error.message
      });
    }
  },

  /**
   * Generate a command to start Caddy with proper settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  generateStartCommand: async (req, res) => {
    try {
      const serverId = req.params.id;
      const server = await caddyService.getServerById(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Caddy server not found'
        });
      }
      
      const command = caddyService.generateCaddyStartCommand(server);
      
      res.status(200).json({
        success: true,
        message: 'Start command generated successfully',
        data: {
          command,
          description: 'Run this command to start Caddy with the configured authentication'
        }
      });
    } catch (error) {
      console.error('Error generating start command:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating Caddy start command',
        error: error.message
      });
    }
  },

  /**
   * Generate a Docker Compose file for a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  generateDockerComposeFile: async (req, res) => {
    try {
      const serverId = req.params.id;
      const server = await caddyService.getServerById(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Caddy server not found'
        });
      }
      
      const dockerComposeContent = caddyService.generateDockerComposeFile(server);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/yaml');
      res.setHeader('Content-Disposition', `attachment; filename=docker-compose-${server.name}.yml`);
      
      // Send the file content
      res.status(200).send(dockerComposeContent);
    } catch (error) {
      console.error('Error generating Docker Compose file:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating Docker Compose file',
        error: error.message
      });
    }
  },

  /**
   * Generate Docker deployment files for a new Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  generateDockerDeployment: async (req, res) => {
    try {
      const serverId = req.params.id;
      const server = await caddyService.getServerById(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Caddy server not found'
        });
      }
      
      // Create a ZIP file with Docker Compose
      const files = {
        'docker-compose.yml': caddyService.generateDockerComposeFile(server)
      };
      
      // Generate response with file
      res.status(200).json({
        success: true,
        message: 'Docker deployment files generated successfully',
        data: {
          files,
          instructions: `
1. Save the docker-compose.yml file
2. Deploy with 'docker-compose up -d'
3. The admin API will be available on ${server.apiUrl}:${server.apiPort} with the configured authentication`
        }
      });
    } catch (error) {
      console.error('Error generating Docker deployment:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating Docker deployment files',
        error: error.message
      });
    }
  },

  /**
   * Get all configurations for a server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getConfigsForServer: async (req, res) => {
    try {
      const serverId = req.params.id;
      const { status } = req.query;
      
      const configs = await caddyService.getConfigs(serverId, { status });
      
      res.status(200).json({
        success: true,
        message: 'Configurations retrieved successfully',
        count: configs.length,
        data: configs
      });
    } catch (error) {
      console.error('Error retrieving configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving configurations',
        error: error.message
      });
    }
  },
  
  /**
   * Get a specific configuration by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getConfigById: async (req, res) => {
    try {
      const configId = req.params.configId;
      const config = await caddyService.getConfigById(configId);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Configuration retrieved successfully',
        data: config
      });
    } catch (error) {
      console.error('Error retrieving configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving configuration',
        error: error.message
      });
    }
  },
  
  /**
   * Create a new configuration for a server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createConfig: async (req, res) => {
    try {
      const serverId = req.params.id;
      let serverIds = [];
      
      // Check if configuration applies to multiple servers
      if (Array.isArray(req.body.servers)) {
        serverIds = req.body.servers;
      } else {
        // Single server mode (backward compatibility)
        serverIds = [serverId];
      }
      
      const configData = {
        servers: serverIds,
        // Keep server field for backward compatibility
        server: serverId,
        ...req.body
      };
      
      // Validate required fields
      if (!configData.name) {
        return res.status(400).json({
          success: false,
          message: 'Name is a required field'
        });
      }
      
      // Validate config content
      if (!configData.jsonConfig) {
        return res.status(400).json({
          success: false,
          message: 'JSON configuration content is required'
        });
      }
      
      // Always use json format
      configData.format = 'json';
      
      // Add history entry if not provided
      if (!configData.history || configData.history.length === 0) {
        configData.history = [{
          action: 'created',
          timestamp: new Date(),
          notes: 'Created via API'
        }];
      }
      
      const newConfig = await caddyService.saveConfig(configData);
      
      // Log the configuration creation to audit log
      await auditService.logAction({
        action: 'create_config',
        user: req.user,
        resourceType: 'config',
        resourceId: newConfig._id,
        details: {
          name: newConfig.name,
          servers: serverIds,
          format: newConfig.format
        },
        statusCode: 201,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(201).json({
        success: true,
        message: 'Configuration created successfully',
        data: newConfig
      });
    } catch (error) {
      console.error('Error creating configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating configuration',
        error: error.message
      });
    }
  },
  
  /**
   * Apply a configuration to one or more servers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  applyConfig: async (req, res) => {
    try {
      const configId = req.params.configId;
      
      // Check if specific servers were provided in the request body
      const targetServerIds = req.body.serverIds || null;
      
      const result = await caddyService.applyConfigToServer(configId, targetServerIds);
      
      // Log the configuration application to audit log
      await auditService.logAction({
        action: 'apply_config',
        user: req.user,
        resourceType: 'config',
        resourceId: configId,
        details: {
          targetServers: targetServerIds || result.serversApplied,
          success: result.success
        },
        statusCode: result.success ? 200 : 500,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Get updated configuration data
      const updatedConfig = await caddyService.getConfigById(configId);
      
      // Get updated server data 
      const updatedServers = [];
      for (const serverResult of result.servers) {
        const server = await caddyServersRepository.findById(serverResult.serverId);
        if (server) {
          updatedServers.push(server);
        }
      }
      
      // Include the updated data in the response
      // Use appropriate status code based on result
      res.status(result.success ? 200 : 500).json({
        success: result.success,
        message: result.message,
        data: {
          ...result,
          config: updatedConfig,
          updatedServers
        }
      });
    } catch (error) {
      console.error('Error applying configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying configuration',
        error: error.message
      });
    }
  },
  
  /**
   * Get the current running JSON configuration from a Caddy server
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getCurrentRunningConfig: async (req, res) => {
    try {
      const serverId = req.params.id;
      const options = {
        skipSaveConfig: req.query.skipSave === 'true', // Use this to determine whether to save in the database
        name: req.query.name,
        description: req.query.description,
        setAsActive: req.query.setAsActive !== 'false', // Default to true
        tags: req.query.tags ? req.query.tags.split(',') : ['auto-retrieved', 'current']
      };
      
      const jsonConfig = await caddyService.getJsonConfig(serverId, options);
      
      res.status(200).json({
        success: true,
        message: 'Current running configuration retrieved successfully',
        data: jsonConfig
      });
    } catch (error) {
      console.error('Error retrieving current configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving current configuration',
        error: error.message
      });
    }
  },
  
  /**
   * Get all configurations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllConfigs: async (req, res) => {
    try {
      // Extract optional filter parameters
      const { status, server } = req.query;
      
      const configs = await caddyService.getAllConfigs({ 
        status,
        server 
      });
      
      res.status(200).json({
        success: true,
        message: 'Configurations retrieved successfully',
        count: configs.length,
        data: configs
      });
    } catch (error) {
      console.error('Error retrieving configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving configurations',
        error: error.message
      });
    }
  },

  /**
   * Delete a configuration by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  deleteConfig: async (req, res) => {
    try {
      const configId = req.params.id;
      const deletedConfig = await caddyService.deleteConfig(configId);
      
      if (!deletedConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }
      
      // Log the configuration deletion to audit log
      await auditService.logAction({
        action: 'delete_config',
        user: req.user,
        resourceType: 'config',
        resourceId: configId,
        details: {
          name: deletedConfig.name,
          servers: deletedConfig.servers
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Configuration deleted successfully',
        data: deletedConfig
      });
    } catch (error) {
      console.error('Error deleting configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting configuration',
        error: error.message
      });
    }
  },

  /**
   * Update a configuration's metadata
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateConfigMetadata: async (req, res) => {
    try {
      const configId = req.params.id;
      const updateData = req.body;
      
      const updatedConfig = await caddyService.updateConfigMetadata(configId, updateData);
      
      if (!updatedConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }
      
      // Log the configuration metadata update to audit log
      await auditService.logAction({
        action: 'update_config_metadata',
        user: req.user,
        resourceType: 'config',
        resourceId: configId,
        details: {
          name: updatedConfig.name,
          updates: updateData
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        data: updatedConfig
      });
    } catch (error) {
      console.error('Error updating configuration metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating configuration metadata',
        error: error.message
      });
    }
  },
  
  /**
   * Update a configuration's content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateConfigContent: async (req, res) => {
    try {
      const configId = req.params.id;
      const contentData = req.body;
      
      const updatedConfig = await caddyService.updateConfigContent(configId, contentData);
      
      if (!updatedConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }
      
      // Log the configuration content update to audit log
      await auditService.logAction({
        action: 'update_config_content',
        user: req.user,
        resourceType: 'config',
        resourceId: configId,
        details: {
          name: updatedConfig.name,
          contentUpdated: true
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Configuration content updated successfully',
        data: updatedConfig
      });
    } catch (error) {
      console.error('Error updating configuration content:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating configuration content',
        error: error.message
      });
    }
  },

  /**
   * Add a new configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  addConfig: async (req, res) => {
    try {
      const configData = req.body;
      
      const newConfig = await caddyService.addConfig(configData);
      
      // Log the configuration addition to audit log
      await auditService.logAction({
        action: 'add_config',
        user: req.user,
        resourceType: 'config',
        resourceId: newConfig._id,
        details: {
          name: newConfig.name,
          servers: newConfig.servers || [newConfig.server]
        },
        statusCode: 201,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(201).json({
        success: true,
        message: 'Configuration added successfully',
        data: newConfig
      });
    } catch (error) {
      console.error('Error adding configuration:', error);
      res.status(400).json({
        success: false,
        message: 'Error adding configuration',
        error: error.message
      });
    }
  },
};

module.exports = caddyController;