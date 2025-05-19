import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/apiService'

/**
 * Store for managing Caddy servers
 * Handles CRUD operations and server status
 */
export const useCaddyServersStore = defineStore('caddyServers', () => {
  // State
  const servers = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const currentServer = ref(null)
  
  // Polling state
  const pollingInterval = ref(null)
  const pollingEnabled = ref(false)
  const pollingFrequency = ref(30000) // Default: 30 seconds
  const isPolling = ref(false)

  // Getters
  const getServerById = computed(() => {
    return (id) => servers.value.find(server => server._id === id)
  })

  const getActiveServers = computed(() => {
    return servers.value.filter(server => server.active === true)
  })

  const getServerCount = computed(() => {
    return servers.value.length
  })
  
  // Get all unique tags across all servers
  const getAllTags = computed(() => {
    const tagsSet = new Set()
    
    servers.value.forEach(server => {
      if (server.tags && Array.isArray(server.tags)) {
        server.tags.forEach(tag => {
          tagsSet.add(tag)
        })
      }
    })
    
    return Array.from(tagsSet).sort()
  })
  
  // Get servers filtered by tag
  const getServersByTag = computed(() => {
    return (tag) => {
      if (!tag) return []
      return servers.value.filter(server => 
        server.tags && 
        Array.isArray(server.tags) && 
        server.tags.includes(tag)
      )
    }
  })

  // Actions
  /**
   * Fetch all servers from the API
   */
  async function fetchServers() {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.get('/caddy/servers')
      // Handle the API response format: { success, count, data }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        servers.value = response.data.data
      } else {
        servers.value = []
        console.warn('Unexpected API response format:', response.data)
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch servers'
      console.error('Error fetching servers:', err)
      servers.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a single server by ID
   * @param {string} id - The server ID
   */
  async function fetchServerById(id) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.get(`/caddy/servers/${id}`)
      // Handle the API response format: { success, data }
      if (response.data && response.data.success) {
        currentServer.value = response.data.data
        return response.data.data
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to fetch server with ID: ${id}`
      console.error(`Error fetching server ${id}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add a new server
   * @param {Object} serverData - The server data
   * @param {boolean} [pullExistingConfig=false] - Whether to pull the existing configuration
   */
  async function addServer(serverData, pullExistingConfig = false) {
    isLoading.value = true
    error.value = null
    
    try {
      // Add pullExistingConfig flag to request if true
      const dataToSend = { ...serverData }
      if (pullExistingConfig) {
        dataToSend.pullExistingConfig = true
      }
      
      const response = await apiService.post('/caddy/servers', dataToSend)
      // Handle the API response format
      if (response.data && response.data.success) {
        const newServer = response.data.data
        servers.value.push(newServer)
        return newServer
      }
      return null
    } catch (err) {
      error.value = err.message || 'Failed to add server'
      console.error('Error adding server:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a server
   * @param {string} id - The server ID
   */
  async function deleteServer(id) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.delete(`/caddy/servers/${id}`)
      
      // Check if deletion was successful
      if (response.data && response.data.success) {
        // Remove the server from the array
        servers.value = servers.value.filter(server => server._id !== id)
        
        // Clear currentServer if it's the one being deleted
        if (currentServer.value && currentServer.value._id === id) {
          currentServer.value = null
        }
        
        return true
      }
      return false
    } catch (err) {
      error.value = err.message || `Failed to delete server with ID: ${id}`
      console.error(`Error deleting server ${id}:`, err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Test connection to a server
   * @param {Object} serverData - The server connection data
   */
  async function testConnection(serverData) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.post('/caddy/servers/test-connection', serverData)
      return response.data
    } catch (err) {
      error.value = err.message || 'Connection test failed'
      console.error('Error testing connection:', err)
      return {
        success: false,
        message: err.message || 'Connection test failed'
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update an existing server
   * @param {string} id - The server ID
   * @param {Object} serverData - The updated server data
   */
  async function updateServer(id, serverData) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.put(`/caddy/servers/${id}`, serverData)
      
      // Handle the API response format
      if (response.data && response.data.success) {
        const updatedServer = response.data.data
        
        // Update the server in the array
        const index = servers.value.findIndex(server => server._id === id)
        if (index !== -1) {
          servers.value[index] = updatedServer
        }
        
        // Update currentServer if it's the one being updated
        if (currentServer.value && currentServer.value._id === id) {
          currentServer.value = updatedServer
        }
        
        return updatedServer
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to update server with ID: ${id}`
      console.error(`Error updating server ${id}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check status of a single server
   * @param {string} id - The server ID
   */
  async function checkServerStatus(id) {
    try {
      // Updated endpoint path to match the backend route
      const response = await apiService.get(`/caddy/servers/${id}/status`)
      
      // Handle the API response format
      if (response.data && response.data.success && response.data.data) {
        const serverInfo = response.data.data
        const status = serverInfo.connectionInfo?.status || 'unknown'
        
        console.log('Single server status response:', serverInfo)
        
        // Update status in servers array
        const index = servers.value.findIndex(server => server._id === id)
        if (index !== -1) {
          servers.value[index].status = status
          // Update lastPinged if available
          if (serverInfo.connectionInfo?.lastChecked) {
            console.log(`Updating lastPinged for ${servers.value[index].name} to ${serverInfo.connectionInfo.lastChecked}`)
            servers.value[index].lastPinged = serverInfo.connectionInfo.lastChecked
          }
        }
        
        // Update currentServer if it's the one being checked
        if (currentServer.value && currentServer.value._id === id) {
          currentServer.value.status = status
          if (serverInfo.connectionInfo?.lastChecked) {
            currentServer.value.lastPinged = serverInfo.connectionInfo.lastChecked
          }
        }
        
        return status
      }
      return 'unknown'
    } catch (err) {
      console.error(`Error checking server status for ${id}:`, err)
      return 'error'
    }
  }

  /**
   * Check status of all servers
   */
  async function checkAllServersStatus() {
    isLoading.value = true
    error.value = null
    
    try {
      // Updated endpoint path to match the backend route
      const response = await apiService.get('/caddy/servers/status')
      
      // Handle the API response format
      if (response.data && response.data.success && response.data.data) {
        const statusData = response.data.data
        
        // Update status for all servers in the details
        if (Array.isArray(statusData.details)) {
          statusData.details.forEach(serverStatus => {
            const index = servers.value.findIndex(s => s._id === serverStatus.id)
            if (index !== -1) {
              servers.value[index].status = serverStatus.status
            }
          })
        }
        
        return statusData
      }
      return null
    } catch (err) {
      error.value = err.message || 'Failed to check servers status'
      console.error('Error checking all servers status:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get servers by tag
   * @param {string} tag - Tag to filter servers by
   * @returns {Array} Filtered array of servers
   */
  function getServersWithTag(tag) {
    if (!tag) return []
    
    return servers.value.filter(server => 
      server.tags && 
      Array.isArray(server.tags) && 
      server.tags.includes(tag)
    )
  }
  
  /**
   * Add tag to a server
   * @param {string} id - Server ID
   * @param {string} tag - Tag to add
   */
  async function addTagToServer(id, tag) {
    if (!id || !tag) return null
    
    const server = servers.value.find(server => server._id === id)
    if (!server) return null
    
    // Prepare updated tags array
    let updatedTags = []
    
    if (server.tags && Array.isArray(server.tags)) {
      // Only add if tag doesn't already exist
      if (!server.tags.includes(tag)) {
        updatedTags = [...server.tags, tag]
      } else {
        // Tag already exists
        return server
      }
    } else {
      updatedTags = [tag]
    }
    
    // Update the server with new tags
    return await updateServer(id, { tags: updatedTags })
  }
  
  /**
   * Remove tag from a server
   * @param {string} id - Server ID
   * @param {string} tag - Tag to remove
   */
  async function removeTagFromServer(id, tag) {
    if (!id || !tag) return null
    
    const server = servers.value.find(server => server._id === id)
    if (!server || !server.tags || !Array.isArray(server.tags)) return null
    
    // Filter out the tag
    const updatedTags = server.tags.filter(t => t !== tag)
    
    // Only update if tags have changed
    if (updatedTags.length !== server.tags.length) {
      return await updateServer(id, { tags: updatedTags })
    }
    
    return server
  }

  /**
   * Restart a server
   * @param {string} id - The server ID
   */
  async function restartServer(id) {
    isLoading.value = true
    error.value = null
    
    try {
      // Create a path for restarting a server - Note: this endpoint doesn't exist in the provided routes
      // You may need to implement or adjust this based on actual API
      const response = await apiService.post(`/caddy/servers/${id}/restart`)
      
      // Handle the API response format
      if (response.data && response.data.success) {
        // Update server status to 'restarting' temporarily
        const index = servers.value.findIndex(server => server._id === id)
        if (index !== -1) {
          servers.value[index].status = 'restarting'
        }
        
        if (currentServer.value && currentServer.value._id === id) {
          currentServer.value.status = 'restarting'
        }
        
        return response.data.data
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to restart server with ID: ${id}`
      console.error(`Error restarting server ${id}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get server detailed information
   * @param {string} id - The server ID
   */
  async function getServerInfo(id) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.get(`/caddy/servers/${id}/info`)
      
      if (response.data && response.data.success) {
        return response.data.data
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to get server info for ID: ${id}`
      console.error(`Error getting server info ${id}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Generate deployment files for a server
   * @param {string} id - The server ID
   */
  async function generateDeployment(id) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await apiService.get(`/caddy/servers/${id}/deployment`)
      
      if (response.data && response.data.success) {
        return response.data.data
      }
      return null
    } catch (err) {
      error.value = err.message || `Failed to generate deployment files for server ID: ${id}`
      console.error(`Error generating deployment files ${id}:`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Start polling for server status updates
   * @param {number} [frequency=30000] - Polling frequency in milliseconds
   */
  function startPolling(frequency = 30000) {
    // Don't start if already polling
    if (pollingInterval.value) {
      return;
    }

    // Update frequency if provided
    if (frequency && frequency > 0) {
      pollingFrequency.value = frequency;
    }

    pollingEnabled.value = true;
    
    // Run an initial status check
    performStatusCheck();
    
    // Set up the polling interval
    pollingInterval.value = setInterval(() => {
      performStatusCheck();
    }, pollingFrequency.value);
    
    console.log(`Status polling started. Checking every ${pollingFrequency.value / 1000} seconds`);
  }

  /**
   * Stop polling for server status updates
   */
  function stopPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
      pollingEnabled.value = false;
      console.log('Status polling stopped');
    }
  }

  /**
   * Perform the actual status check for all servers
   */
  async function performStatusCheck() {
    // Don't run concurrent status checks
    if (isPolling.value || servers.value.length === 0) {
      return;
    }
    
    isPolling.value = true;
    
    try {
      const response = await apiService.get('/caddy/servers/status');
      
      if (response.data && response.data.success && response.data.data) {
        const statusData = response.data.data;
        
        console.log('Status data received:', statusData);
        
        // Update status for each server in the details
        if (Array.isArray(statusData.details)) {
          statusData.details.forEach(serverStatus => {
            const index = servers.value.findIndex(s => s._id === serverStatus.id);
            if (index !== -1) {
              // Update status
              servers.value[index].status = serverStatus.status;
              
              // Always update lastPinged when we get a status update
              if (serverStatus.lastPinged) {
                console.log(`Updating lastPinged for ${servers.value[index].name} to ${serverStatus.lastPinged}`);
                servers.value[index].lastPinged = serverStatus.lastPinged;
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('Error during status polling:', err);
    } finally {
      isPolling.value = false;
    }
  }

  /**
   * Set polling frequency
   * @param {number} frequency - Polling frequency in milliseconds
   */
  function setPollingFrequency(frequency) {
    if (frequency && frequency > 0) {
      pollingFrequency.value = frequency;
      
      // Restart polling with new frequency if currently active
      if (pollingInterval.value) {
        stopPolling();
        startPolling(frequency);
      }
    }
  }

  /**
   * Getter to check if polling is enabled
   */
  const isPollingEnabled = computed(() => pollingEnabled.value);

  /**
   * Getter for current polling frequency
   */
  const currentPollingFrequency = computed(() => pollingFrequency.value);

  /**
   * Clean up polling on component unmount
   */
  function cleanupPolling() {
    stopPolling();
  }

  /**
   * Get the active configuration for a server
   * @param {string} id - Server ID
   * @returns {string|null} - ID of the active configuration or null
   */
  function getActiveConfigId(id) {
    const server = getServerById.value(id);
    return server && server.activeConfig ? server.activeConfig : null;
  }
  
  /**
   * Check if a configuration is active on a server
   * @param {string} serverId - Server ID
   * @param {string} configId - Configuration ID
   * @returns {boolean} - True if config is active on the server
   */
  function isConfigActiveOnServer(serverId, configId) {
    const server = getServerById.value(serverId);
    return server && server.activeConfig === configId;
  }

  // Return state, getters, and actions
  return {
    // State
    servers,
    isLoading,
    error,
    currentServer,
    
    // Polling state and getters
    isPollingEnabled,
    currentPollingFrequency,
    isPolling,
    
    // Getters
    getServerById,
    getActiveServers,
    getServerCount,
    getAllTags,
    getServersByTag,
    getActiveConfigId,
    isConfigActiveOnServer,
    
    // Actions
    fetchServers,
    fetchServerById,
    addServer,
    testConnection,
    updateServer,
    deleteServer,
    checkServerStatus,
    checkAllServersStatus,
    restartServer,
    getServerInfo,
    generateDeployment,
    getServersWithTag,
    addTagToServer,
    removeTagFromServer,
    
    // Polling actions
    startPolling,
    stopPolling,
    setPollingFrequency,
    cleanupPolling
  }
})