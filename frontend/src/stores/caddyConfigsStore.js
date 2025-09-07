import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import apiService from '../services/apiService'

/**
 * Store for managing Caddy configurations
 * Handles CRUD operations and config status
 */
export const useCaddyConfigsStore = defineStore('caddyConfigs', () => {
  // State
  const configs = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  // Getters - Only access local state, no API calls
  const getConfigById = computed(() => {
    return (id) => configs.value.find(config => config._id === id)
  })

  // Get the active config for a server
  const getConfigByServer = computed(() => {
    return (serverId) => {
      return configs.value
        .filter(config => 
          config.servers && 
          Array.isArray(config.servers) && 
          config.servers.some(s => 
            (typeof s === 'string' && s === serverId) ||
            (typeof s === 'object' && s._id === serverId)
          )
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null
    }
  })

  const getConfigCount = computed(() => {
    return configs.value.length
  })

  // Actions
  /**
   * Initialize the store - Call this when the app starts
   */
  async function initialize() {
    if (!isInitialized.value) {
      await fetchAllConfigs()
      isInitialized.value = true
    }
  }

  /**
   * Fetch all configurations from the database
   * @param {Object} options - Filter options
   */
  async function fetchAllConfigs(options = {}) {
    isLoading.value = true
    error.value = null
    
    let queryParams = new URLSearchParams()
    if (options.server) queryParams.append('server', options.server)
    if (options.status) queryParams.append('status', options.status)
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
    
    try {
      const response = await apiService.get(`/caddy/configs${queryString}`)
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        configs.value = response.data.data.map(config => {
          if (!config.servers) {
            config.servers = []
          }
          return config
        })
        return response.data.data
      } else {
        console.warn('Unexpected API response format:', response.data)
        return []
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch configurations'
      console.error('Error fetching configurations:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a specific configuration by ID
   * @param {string} configId - The configuration ID
   */
  async function fetchConfigById(configId) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.get(`/caddy/configs/${configId}`)
      
      if (response.data && response.data.success) {
        const config = response.data.data
        const index = configs.value.findIndex(c => c._id === configId)
        if (index !== -1) {
          configs.value[index] = config
        } else {
          configs.value.push(config)
        }
        return config
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to fetch configuration with ID: ${configId}`
      console.error(`Error fetching configuration ${configId}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new configuration
   * @param {string|null} serverId - The primary server ID (can be null for standalone configs)
   * @param {Object} configData - The configuration data
   */
  async function createConfig(serverId, configData) {
    isLoading.value = true
    error.value = null
    
    try {
      // Ensure we have a servers array in the configData
      if (!configData.servers) {
        configData.servers = [];
      }
      
      // Add the server ID to the servers array if provided
      if (serverId) {
        configData.servers.push(serverId);
      }
      
      // Use different endpoints based on whether a server is specified
      let endpoint = serverId 
        ? `/caddy/servers/${serverId}/configs` 
        : '/caddy/configs';
        
      const response = await apiService.post(endpoint, configData);
      
      if (response.data && response.data.success) {
        const newConfig = response.data.data
        configs.value.push(newConfig)
        return newConfig
      }
      return null
    } catch (err) {
      error.value = err.message || 'Failed to create configuration'
      console.error('Error creating configuration:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Creates a new configuration using the addConfig endpoint
   * @param {Object} configData - The configuration data to add
   * @returns {Object|null} - New config or null if failed
   */
  async function addConfig(configData) {
    isLoading.value = true
    error.value = null
    
    try {
      // Use the new direct endpoint for creating configurations
      const response = await apiService.post('/caddy/configs', configData)
      
      if (response.data && response.data.success) {
        const newConfig = response.data.data
        configs.value.push(newConfig)
        return newConfig
      }
      return null
    } catch (err) {
      error.value = err.message || 'Failed to add configuration'
      console.error('Error adding configuration:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a configuration's metadata
   * @param {string} configId - The configuration ID
   * @param {Object} configData - The updated configuration data
   * @returns {Object|null} - Updated config or null if failed
   */
  async function updateConfig(configId, configData) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.put(`/caddy/configs/${configId}`, configData)
      
      if (response.data && response.data.success) {
        const updatedConfig = response.data.data
        const index = configs.value.findIndex(c => c._id === configId)
        
        if (index !== -1) {
          configs.value[index] = updatedConfig
        }
        
        return updatedConfig
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to update configuration with ID: ${configId}`
      console.error(`Error updating configuration ${configId}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a configuration's content (JSON data)
   * @param {string} configId - The configuration ID
   * @param {Object} contentData - The updated content data
   * @returns {Object|null} - Updated config or null if failed
   */
  async function updateConfigContent(configId, contentData) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.put(`/caddy/configs/${configId}/content`, contentData)
      
      if (response.data && response.data.success) {
        const updatedConfig = response.data.data
        const index = configs.value.findIndex(c => c._id === configId)
        
        if (index !== -1) {
          configs.value[index] = updatedConfig
        }
        
        return updatedConfig
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to update configuration content with ID: ${configId}`
      console.error(`Error updating configuration content ${configId}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Apply a configuration to one or more servers
   * @param {string} configId - Config ID to apply
   * @param {string[]} serverIds - Optional array of server IDs to apply to (if not provided, will use all associated servers)
   * @returns {Promise<Object>} - Response from the API
   */
  async function applyConfig(configId, serverIds = null) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const requestBody = {};
      
      if (serverIds && Array.isArray(serverIds)) {
        requestBody.serverIds = serverIds;
      }
      
      console.log(`Applying config ${configId} to servers:`, serverIds || 'all associated servers');
      
      const response = await apiService.post(
        `/caddy/configs/${configId}/apply`,
        requestBody
      );
      
      // Check if the response indicates success or failure
      if (response.data && response.data.success) {
        // Update the config status to 'live'
        const index = configs.value.findIndex(c => c._id === configId);
        if (index !== -1) {
          configs.value[index].status = 'live';
        }
        
        // Refresh all configurations and servers to get the latest data
        await fetchAllConfigs();
        
        // Return the response data
        return response.data.data || response.data;
      } else if (response.data && !response.data.success) {
        // The API returned a response but indicates failure
        // Return the error response so the UI can handle it
        return response.data;
      }
      
      return null;
    } catch (err) {
      // Set a detailed error message
      let errorMessage = `Failed to apply configuration`;
      
      if (err.response && err.response.data) {
        // If we have detailed error information from the backend, use it
        if (err.response.data.data && err.response.data.data.failed && err.response.data.data.failed.length > 0) {
          const failedServer = err.response.data.data.failed[0];
          errorMessage = failedServer.error || err.response.data.message || errorMessage;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
        
        // Return the detailed error response for the UI to handle
        return err.response.data;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      error.value = errorMessage;
      console.error(`Error applying configuration ${configId}:`, err);
      
      // Return error information for the UI
      return {
        success: false,
        message: errorMessage,
        error: err.message
      };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetch the current JSON configuration from a server
   * @param {string} serverId - The server ID
   * @param {Object} options - Options for the operation
   */
  async function fetchCurrentConfig(serverId, options = {}) {
    isLoading.value = true
    error.value = null
    
    let queryParams = new URLSearchParams()
    if (options.name) queryParams.append('name', options.name)
    if (options.description) queryParams.append('description', options.description)
    if (options.skipSave !== undefined) queryParams.append('skipSave', options.skipSave)
    if (options.setAsActive !== undefined) queryParams.append('setAsActive', options.setAsActive)
    if (options.tags) queryParams.append('tags', options.tags)
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
    
    try {
      const response = await apiService.get(`/caddy/servers/${serverId}/current-config${queryString}`)
      
      if (response.data && response.data.success) {
        if (response.data.data.config) {
          const newConfig = response.data.data.config
          configs.value.push(newConfig)
          
          await fetchAllConfigs()
        }
        return response.data.data
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to fetch current configuration for server: ${serverId}`
      console.error(`Error fetching current configuration for ${serverId}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a configuration
   * @param {string} configId - The configuration ID to delete
   */
  async function deleteConfig(configId) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.delete(`/caddy/configs/${configId}`)
      
      if (response.data && response.data.success) {
        configs.value = configs.value.filter(config => config._id !== configId)
        return true
      }
      return false
    } catch (err) {
      error.value = err.message || `Failed to delete configuration with ID: ${configId}`
      console.error(`Error deleting configuration ${configId}:`, err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    initialize()
  })

  return {
    configs,
    isLoading,
    error,
    isInitialized,
    
    getConfigById,
    getConfigByServer,
    getConfigCount,
    
    initialize,
    fetchAllConfigs,
    fetchConfigById,
    createConfig,
    addConfig,
    updateConfig,
    updateConfigContent,
    applyConfig,
    fetchCurrentConfig,
    deleteConfig
  }
})