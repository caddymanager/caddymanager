<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 flex items-center justify-center z-50">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/70" @click="cancelAction"></div>
      
      <!-- Dialog content -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-900">Apply Configuration</h3>
        
        <!-- Configuration name -->
        <div class="mt-2 flex items-center">
          <span class="font-semibold text-sm text-gray-600">Configuration:</span>
          <span class="ml-2 text-sm">{{ config.name }}</span>
        </div>
        
        <!-- Target servers selection -->
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700">Apply to:</label>
          <div class="mt-2">
            <div class="flex items-center mb-2">
              <input
                id="all-associated-servers"
                v-model="targetType"
                type="radio"
                value="all"
                class="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <label for="all-associated-servers" class="ml-2 block text-sm text-gray-700">
                All associated servers ({{ associatedServers.length }})
              </label>
            </div>
            
            <div class="flex items-center mb-2">
              <input
                id="specific-servers"
                v-model="targetType"
                type="radio"
                value="specific"
                class="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <label for="specific-servers" class="ml-2 block text-sm text-gray-700">
                Select specific servers
              </label>
            </div>
            
            <div class="flex items-center">
              <input
                id="servers-by-tag"
                v-model="targetType"
                type="radio"
                value="tag"
                class="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <label for="servers-by-tag" class="ml-2 block text-sm text-gray-700">
                Servers with tag
              </label>
            </div>
          </div>
        </div>
        
        <!-- Server selection dropdown (visible when 'specific' is selected) -->
        <div v-if="targetType === 'specific'" class="mt-3">
          <label class="block text-sm font-medium text-gray-700">Select Servers:</label>
          <div class="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            <div v-for="server in availableServers" :key="server._id" class="flex items-center py-1">
              <input
                :id="`server-${server._id}`"
                v-model="selectedServerIds"
                type="checkbox"
                :value="server._id"
                class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label :for="`server-${server._id}`" class="ml-2 block text-sm text-gray-700">
                {{ server.name }} <span v-if="server.status === 'online'" class="text-green-500">(Online)</span>
                <span v-else class="text-red-500">(Offline)</span>
              </label>
            </div>
            <div v-if="availableServers.length === 0" class="text-sm text-gray-500 py-2">
              No servers available
            </div>
          </div>
          <div v-if="selectedServerIds.length > 0" class="mt-1 text-xs text-gray-500">
            {{ selectedServerIds.length }} server(s) selected
          </div>
        </div>
        
        <!-- Tag selection dropdown (visible when 'tag' is selected) -->
        <div v-if="targetType === 'tag'" class="mt-3">
          <label class="block text-sm font-medium text-gray-700">Select Tag:</label>
          <div class="mt-1">
            <select
              v-model="selectedTag"
              class="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="" disabled>Select a tag</option>
              <option v-for="tag in availableTags" :key="tag" :value="tag">
                {{ tag }} ({{ serversWithTag(tag).length }} servers)
              </option>
            </select>
          </div>
          
          <!-- Show which servers have the selected tag -->
          <div v-if="selectedTag && serversWithTag(selectedTag).length > 0" class="mt-2">
            <label class="block text-xs font-medium text-gray-700">Servers with this tag:</label>
            <div class="mt-1 text-xs text-gray-600">
              <div v-for="(server, index) in serversWithTag(selectedTag)" :key="server._id" class="inline">
                {{ server.name }}<span v-if="index < serversWithTag(selectedTag).length - 1">, </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Status message area -->
        <div class="mt-4">
          <p class="text-sm text-gray-500">
            {{ statusMessage }}
          </p>
        </div>
        
        <!-- Error message display -->
        <div v-if="error" class="mt-3 p-3 border border-red-200 bg-red-50 rounded-md">
          <p class="text-sm font-medium text-red-700">{{ error }}</p>
        </div>

        <!-- Info message about validation -->
        <div v-if="!error && !isProcessing" class="mt-3 p-2 border border-blue-100 bg-blue-50 rounded-md">
          <p class="text-xs text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Configurations are validated before being applied to protect your servers.
          </p>
        </div>
        
        <!-- Progress indicator -->
        <div v-if="isProcessing" class="mt-4 flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-gray-700">Applying configuration...</span>
        </div>
        
        <!-- Action buttons -->
        <div class="mt-5 flex justify-end gap-3">
          <button 
            type="button" 
            class="cursor-pointer px-3 py-2 text-sm font-medium text-tertiary bg-white hover:bg-gray-50 hover:text-tertiary-dark border border-gray-300 rounded-md shadow-sm"
            @click="cancelAction"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="cursor-pointer px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md shadow-sm focus:outline-none"
            @click="applyConfiguration"
            :disabled="isProcessing || !isValid"
          >
            <span v-if="isProcessing">Applying...</span>
            <span v-else>Apply Configuration</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore';
import { useCaddyServersStore } from '@/stores/caddyServersStore';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  config: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

// Store initialization
const configsStore = useCaddyConfigsStore();
const serversStore = useCaddyServersStore();

// Component state
const targetType = ref('all'); // 'all', 'specific', or 'tag'
const selectedServerIds = ref([]);
const selectedTag = ref('');
const isProcessing = ref(false);
const error = ref('');
const statusMessage = ref('Apply this configuration to your Caddy servers');
const validationErrors = ref([]);

// Computed properties
const availableServers = computed(() => {
  return serversStore.servers;
});

// Get servers that are associated with the configuration
const associatedServers = computed(() => {
  if (!props.config || !props.config.servers) return [];
  
  return props.config.servers.map(serverId => {
    // If serverId is already an object with _id
    if (typeof serverId === 'object' && serverId._id) {
      return serversStore.getServerById(serverId._id);
    }
    // If serverId is a string
    return serversStore.getServerById(serverId);
  }).filter(Boolean); // Remove null/undefined values
});

// Get all unique tags from all servers
const availableTags = computed(() => {
  const tagsSet = new Set();
  
  serversStore.servers.forEach(server => {
    if (server.tags && Array.isArray(server.tags)) {
      server.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  
  return Array.from(tagsSet);
});

// Validation
const isValid = computed(() => {
  if (targetType.value === 'specific') {
    return selectedServerIds.value.length > 0;
  }
  if (targetType.value === 'tag') {
    return !!selectedTag.value;
  }
  return true; // For 'all' option, always valid
});

// Get servers that have a specific tag
const serversWithTag = (tag) => {
  if (!tag) return [];
  return serversStore.servers.filter(server => 
    server.tags && Array.isArray(server.tags) && server.tags.includes(tag)
  );
};

// Clear form when modal is opened or closed
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Initialize with default values
    targetType.value = 'all';
    selectedServerIds.value = [];
    selectedTag.value = '';
    error.value = '';
    statusMessage.value = 'Apply this configuration to your Caddy servers';
    validationErrors.value = [];
  }
});

// Validate the configuration for common issues
const validateConfig = (config) => {
  try {
    let errors = [];
    
    // Check for server port conflicts
    const portMap = new Map();
    
    if (config?.apps?.http?.servers) {
      const servers = config.apps.http.servers;
      
      for (const [serverName, serverConfig] of Object.entries(servers)) {
        // Check for port conflicts
        if (serverConfig.listen) {
          for (const listenAddr of serverConfig.listen) {
            const portMatch = listenAddr.match(/:(\d+)$/);
            if (portMatch) {
              const port = portMatch[1];
              
              if (portMap.has(port)) {
                if (!hasHostSpecificRoutes(serverConfig, serverName) || !hasHostSpecificRoutes(servers[portMap.get(port)], portMap.get(port))) {
                  errors.push(`Port conflict: Multiple servers (${portMap.get(port)} and ${serverName}) listening on port ${port} without host-specific routes`);
                }
              }
              portMap.set(port, serverName);
            }
          }
        }
        
        // Check for load balancer configuration issues
        if (serverConfig.routes) {
          serverConfig.routes.forEach((route, routeIndex) => {
            if (route.handle) {
              route.handle.forEach((handler, handlerIndex) => {
                // Check for lb_policy field (which is invalid in JSON format)
                if (handler.handler === 'reverse_proxy' && handler.lb_policy) {
                  errors.push(`Invalid field "lb_policy" found in server "${serverName}" route ${routeIndex}. 
                  
In Caddy's JSON format, use this structure instead:
"load_balancing": {
  "selection_policy": {
    "policy": "${handler.lb_policy}"
  }
}`);
                }
                
                // Check for string value in selection_policy (should be an object)
                if (handler.handler === 'reverse_proxy' && handler.load_balancing && 
                    handler.load_balancing.selection_policy && 
                    typeof handler.load_balancing.selection_policy === 'string') {
                  errors.push(`Invalid structure for load balancing in server "${serverName}" route ${routeIndex}.
                  
The "selection_policy" must be an object, not a string. Change:
"load_balancing": {
  "selection_policy": "${handler.load_balancing.selection_policy}"
}

To the correct format:
"load_balancing": {
  "selection_policy": {
    "policy": "${handler.load_balancing.selection_policy}"
  }
}`);
                }
              });
            }
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  } catch (error) {
    console.error('Config validation error:', error);
    return { 
      isValid: false, 
      errors: ['Configuration validation failed: ' + error.message] 
    };
  }
};

// Function to check if a server has host-specific routes
const hasHostSpecificRoutes = (serverConfig, serverName) => {
  if (!serverConfig.routes) return false;
  
  for (const route of serverConfig.routes) {
    if (route.match && route.match.length > 0) {
      for (const match of route.match) {
        if (match.host && match.host.length > 0) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Apply the configuration
const applyConfiguration = async () => {
  if (isProcessing.value || !isValid.value) return;
  
  // Validate configuration first
  if (props.config?.jsonConfig) {
    const validationResult = validateConfig(props.config.jsonConfig);
    
    if (!validationResult.isValid) {
      error.value = validationResult.errors.join('\n');
      validationErrors.value = validationResult.errors;
      emit('error', error.value);
      return;
    }
  }
  
  isProcessing.value = true;
  error.value = '';
  validationErrors.value = [];
  
  try {
    let serverIds = [];
    
    // Determine which server IDs to use based on the selection
    if (targetType.value === 'all') {
      // Use all associated servers
      serverIds = props.config.servers.map(server => {
        return typeof server === 'object' ? server._id : server;
      });
    } else if (targetType.value === 'specific') {
      // Use specifically selected servers
      serverIds = selectedServerIds.value;
    } else if (targetType.value === 'tag') {
      // Use servers with the selected tag
      serverIds = serversWithTag(selectedTag.value).map(server => server._id);
    }
    
    // Call the store method to apply the configuration
    const result = await configsStore.applyConfig(props.config._id, serverIds);
    
    if (result) {
      emit('success', {
        config: props.config,
        serverIds,
        result
      });
      
      statusMessage.value = `Configuration applied successfully to ${result.servers.length} server(s)`;
      
      // Close modal after a short delay
      setTimeout(() => {
        emit('update:modelValue', false);
      }, 2000);
    } else {
      error.value = 'Failed to apply configuration. See console for details.';
      emit('error', 'Failed to apply configuration');
    }
  } catch (err) {
    console.error('Error applying configuration:', err);
    
    // Check for specific error types
    if (err.message && err.message.includes('unknown field "lb_policy"')) {
      error.value = 'Failed to apply configuration: The JSON configuration uses "lb_policy" which is not valid in Caddy JSON format. Please change it to "load_balancing: { selection_policy: "..." }" instead.';
    } else {
      error.value = err.message || 'An error occurred while applying the configuration';
    }
    
    emit('error', error.value);
  } finally {
    isProcessing.value = false;
  }
};

// Close modal
const cancelAction = () => {
  if (!isProcessing.value) {
    emit('update:modelValue', false);
  }
};

// Make sure we have the latest server data
onMounted(async () => {
  if (serversStore.servers.length === 0) {
    await serversStore.fetchServers();
  }
});
</script>