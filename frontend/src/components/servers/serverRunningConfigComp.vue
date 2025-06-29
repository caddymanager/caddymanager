<template>
  <div class="bg-white shadow rounded-lg overflow-hidden h-full">
    <div class="p-4 bg-gray-50 border-b border-gray-200">
      <h3 class="font-medium text-lg flex items-center justify-between">
        <span class="flex items-center">
          <ServerIcon class="h-5 w-5 mr-2 text-tertiary" />
          Server Configuration
        </span>
        <div class="flex gap-2">
          <button
            @click="showCurrentConfig"
            class="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            title="View current running configuration"
          >
            <EyeIcon class="h-4 w-4 mr-1" />
            View Running Config
          </button>
        </div>
      </h3>
    </div>
    <div class="p-4">
      <div v-if="isLoading" class="flex justify-center items-center py-10">
        <LoadingSpinnerComp
          caption="Loading configuration..."
          color="gradient"
          size="medium"
        />
      </div>
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {{ error }}
      </div>
      <div v-else-if="activeConfig" class="space-y-4">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100">
          <div>
            <h4 class="font-medium">{{ activeConfig.name }}</h4>
            <p class="text-sm text-gray-500">
              {{ activeConfig.metadata?.description || 'No description provided' }}
            </p>
          </div>
          <div class="mt-2 md:mt-0 flex flex-wrap gap-2">
            <span v-if="activeConfig.status" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  :class="getStatusClass(activeConfig.status)">
              {{ activeConfig.status }}
            </span>
            <span v-for="(tag, index) in parsedTags" :key="index"
                  class="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
              {{ tag }}
            </span>
          </div>
        </div>
        
        <div class="text-sm text-gray-600">
          <p>Last updated: {{ formatDate(activeConfig.updatedAt) }}</p>
          <p>Created: {{ formatDate(activeConfig.createdAt) }}</p>
        </div>

        <!-- Configuration Preview Section -->
        <div class="mt-4 border-t border-gray-100 pt-4">
          <h5 class="font-medium text-sm mb-3 text-tertiary">Configuration Overview</h5>
          <div class="bg-gray-50 rounded-lg p-4">
            <!-- Sites overview -->
            <div v-if="parsedSites.length > 0" class="mb-4">
              <h6 class="text-sm font-medium text-tertiary mb-2 flex items-center">
                <GlobeAltIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                Sites
                <span class="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 ml-2">
                  {{ parsedSites.length }}
                </span>
              </h6>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div v-for="(site, index) in parsedSites.slice(0, 2)" :key="index" 
                     class="border border-gray-200 bg-white rounded-md p-2 text-sm">
                  <div class="font-medium">{{ site.hostnames.join(', ') }}</div>
                  <div class="text-xs text-gray-500">
                    {{ site.type }}: {{ site.upstreamTargets.join(', ') }}
                  </div>
                </div>
              </div>
              <div v-if="parsedSites.length > 2" class="text-xs text-tertiary mt-2">
                ...and {{ parsedSites.length - 2 }} more site{{ parsedSites.length - 2 > 1 ? 's' : '' }}
              </div>
            </div>
            
            <!-- Listen addresses -->
            <div v-if="parsedListenAddresses.length > 0" class="mb-4">
              <h6 class="text-sm font-medium text-tertiary mb-2 flex items-center">
                <ServerStackIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                Listen Addresses
              </h6>
              
              <div class="flex flex-wrap gap-1">
                <span v-for="(address, i) in parsedListenAddresses" :key="i" 
                  class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                  {{ address }}
                </span>
              </div>
            </div>

            <!-- Admin settings preview -->
            <div v-if="hasAdminConfig" class="mb-4">
              <h6 class="text-sm font-medium text-tertiary mb-2 flex items-center">
                <ShieldCheckIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                Admin Configuration
              </h6>
              <div class="text-xs text-gray-600">
                {{ parsedAdminConfig.listen ? `Admin endpoint: ${parsedAdminConfig.listen}` : 'Default admin settings' }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex flex-wrap gap-2 pt-2">
          <button
            @click="showConfigDetails"
            class="inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <DocumentMagnifyingGlassIcon class="h-4 w-4 mr-1" />
            View Details
          </button>
          
          <button
            @click="applyConfig"
            class="inline-flex items-center px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            <ArrowDownOnSquareIcon class="h-4 w-4 mr-1" />
            Apply Config
          </button>
        </div>
      </div>
      <div v-else class="text-center py-10 text-gray-500">
        <p>No active configuration found.</p>
        <p class="text-sm mt-2">
          Click "View Running Config" to see the current server configuration.
        </p>
      </div>
    </div>
    
    <!-- Modal for viewing current running configuration -->
    <ModalActualConfigComp
      v-model="showActualConfigModal"
      :server-id="serverId"
      @config-saved="onConfigSaved"
    />
    
    <!-- Config Content Modal -->
    <ModalConfigContentComp
      v-model="showConfigContentModal"
      :config-id="activeConfig?._id"
      v-if="activeConfig"
    />
    
    <!-- Confirm Apply Config Modal -->
    <ModalConfirmComp
      v-model="showApplyConfirmModal"
      title="Apply Configuration"
      message="Are you sure you want to apply this configuration to the server? This will overwrite the current server configuration."
      confirm-text="Apply Configuration"
      cancel-text="Cancel"
      :is-processing="isApplying"
      :error="applyError"
      @confirm="confirmApplyConfig"
    />
    
    <!-- Error Details Modal -->
    <div v-if="showDetailedError" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h3 class="text-lg font-medium text-red-600 mb-4">Configuration Error Details</h3>
        <pre class="text-sm text-gray-800 whitespace-pre-wrap">{{ configErrors }}</pre>
        <div class="mt-4 flex justify-end">
          <button @click="toggleErrorDetails" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore';
import { useCaddyServersStore } from '@/stores/caddyServersStore';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';
import ModalActualConfigComp from './modalActualConfigComp.vue';
import ModalConfigContentComp from './modalConfigContentComp.vue';
import ModalConfirmComp from '@/components/modals/modalConfirmComp.vue';
import { 
  ServerIcon, 
  EyeIcon, 
  DocumentMagnifyingGlassIcon, 
  ArrowDownOnSquareIcon,
  GlobeAltIcon,
  ServerStackIcon,
  ShieldCheckIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  serverId: {
    type: String,
    required: true
  }
});

// Stores and router
const configsStore = useCaddyConfigsStore();
const serversStore = useCaddyServersStore();
const router = useRouter();

// Local state
const isLoading = ref(false);
const error = ref(null);
const showActualConfigModal = ref(false);
const showConfigContentModal = ref(false);
const showApplyConfirmModal = ref(false);
const isApplying = ref(false);
const applyError = ref(null);

// Add a new ref for detailed errors
const configErrors = ref('');
const showDetailedError = ref(false);

// Computed properties
const server = computed(() => serversStore.getServerById(props.serverId));
const activeConfig = computed(() => configsStore.getConfigByServer(props.serverId));

// Parse tags from config
const parsedTags = computed(() => {
  if (!activeConfig.value?.metadata?.tags) return [];
  
  // Handle both string and array formats
  if (typeof activeConfig.value.metadata.tags === 'string') {
    return activeConfig.value.metadata.tags.split(',').map(tag => tag.trim());
  }
  
  return activeConfig.value.metadata.tags;
});

// Get the configuration content
const configContent = computed(() => {
  if (!activeConfig.value) return null;
  
  // Try to get the content from different possible locations
  if (activeConfig.value.content && typeof activeConfig.value.content === 'object') {
    return activeConfig.value.content;
  }
  
  if (activeConfig.value.jsonConfig && typeof activeConfig.value.jsonConfig === 'object') {
    return activeConfig.value.jsonConfig;
  }
  
  // If content is a JSON string, parse it
  if (activeConfig.value.content && typeof activeConfig.value.content === 'string') {
    try {
      return JSON.parse(activeConfig.value.content);
    } catch (e) {
      return { error: "Unable to parse JSON content" };
    }
  }
  
  return null;
});

// Extract sites from Caddy config for structured view
const parsedSites = computed(() => {
  if (!configContent.value) return [];
  
  try {
    const sites = [];
    // Try to get server routes from HTTP app config
    const httpServers = configContent.value?.apps?.http?.servers || {};
    
    for (const [serverName, serverConfig] of Object.entries(httpServers)) {
      if (serverConfig.routes && Array.isArray(serverConfig.routes)) {
        serverConfig.routes.forEach(route => {
          // Extract host and other matchers
          const hostnames = [];
          let type = 'HTTP Proxy';
          let upstreamTargets = [];
          const options = {};
          
          // Get hostnames
          if (route.match && Array.isArray(route.match)) {
            route.match.forEach(matcher => {
              if (matcher.host && Array.isArray(matcher.host)) {
                hostnames.push(...matcher.host);
              }
              // Add other matchers to options
              Object.entries(matcher)
                .filter(([key]) => key !== 'host')
                .forEach(([key, value]) => {
                  options[key] = JSON.stringify(value);
                });
            });
          }
          
          // Find handler type and upstream targets
          if (route.handle && Array.isArray(route.handle)) {
            route.handle.forEach(handler => {
              // Detect common handler types
              if (handler.handler === 'reverse_proxy') {
                type = 'Reverse Proxy';
                if (handler.upstreams && Array.isArray(handler.upstreams)) {
                  upstreamTargets = handler.upstreams.map(upstream => upstream.dial || JSON.stringify(upstream));
                }
              } else if (handler.handler === 'file_server') {
                type = 'File Server';
                if (handler.root) {
                  upstreamTargets = [handler.root];
                }
              } else if (handler.handler === 'static_response') {
                type = 'Static Response';
                if (handler.body) {
                  upstreamTargets = [handler.body.substring(0, 50) + (handler.body.length > 50 ? '...' : '')];
                }
              } else if (handler.handler === 'subroute') {
                // Look deeper into subroutes for handlers
                if (handler.routes && Array.isArray(handler.routes)) {
                  handler.routes.forEach(subroute => {
                    if (subroute.handle && Array.isArray(subroute.handle)) {
                      subroute.handle.forEach(subHandler => {
                        if (subHandler.handler === 'reverse_proxy') {
                          type = 'Reverse Proxy';
                          if (subHandler.upstreams && Array.isArray(subHandler.upstreams)) {
                            upstreamTargets = subHandler.upstreams.map(upstream => upstream.dial || JSON.stringify(upstream));
                          }
                        } else if (subHandler.handler === 'file_server') {
                          type = 'File Server';
                          if (subHandler.root) {
                            upstreamTargets = [subHandler.root];
                          }
                        }
                      });
                    }
                  });
                }
              } else {
                if (!upstreamTargets.length) {
                  type = handler.handler || 'Unknown';
                }
              }
            });
          }
          
          // Only add if we have hostnames
          if (hostnames.length) {
            sites.push({
              serverName,
              hostnames,
              type,
              upstreamTargets: upstreamTargets.length ? upstreamTargets : ['No target specified']
            });
          }
        });
      }
    }
    
    return sites;
  } catch (err) {
    console.error('Error parsing sites from configuration:', err);
    return [];
  }
});

// Extract listen addresses
const parsedListenAddresses = computed(() => {
  if (!configContent.value) return [];
  
  try {
    const addresses = new Set();
    const httpServers = configContent.value?.apps?.http?.servers || {};
    
    for (const serverConfig of Object.values(httpServers)) {
      if (serverConfig.listen && Array.isArray(serverConfig.listen)) {
        serverConfig.listen.forEach(addr => addresses.add(addr));
      }
    }
    
    return Array.from(addresses);
  } catch (err) {
    console.error('Error parsing listen addresses from configuration:', err);
    return [];
  }
});

// Extract admin configuration
const parsedAdminConfig = computed(() => {
  if (!configContent.value) return {};
  
  try {
    return configContent.value.admin || {};
  } catch (err) {
    console.error('Error parsing admin config:', err);
    return {};
  }
});

const hasAdminConfig = computed(() => Object.keys(parsedAdminConfig.value).length > 0);

// Load server's active configuration
const loadServerConfig = async () => {
  if (!props.serverId) return;
  
  isLoading.value = true;
  error.value = null;
  
  try {
    await configsStore.fetchAllConfigs({ server: props.serverId });
  } catch (err) {
    error.value = `Failed to load server configuration: ${err.message}`;
    console.error('Error loading server configuration:', err);
  } finally {
    isLoading.value = false;
  }
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Get CSS class for config status
const getStatusClass = (status) => {
  switch (status.toLowerCase()) {
    case 'live': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-yellow-100 text-yellow-800';
    case 'archived': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Show config details
const showConfigDetails = () => {
  if (activeConfig.value?._id) {
    // Using the correct route from router configuration
    router.push({ name: 'configDetails', params: { id: activeConfig.value._id }});
  }
};

// Show the actual running configuration modal
const showCurrentConfig = () => {
  showActualConfigModal.value = true;
};

// Handle config saved event from modal
const onConfigSaved = async (config) => {
  await loadServerConfig();
};

// Start apply config process
const applyConfig = () => {
  applyError.value = null;
  showApplyConfirmModal.value = true;
};

// Apply configuration to server
const confirmApplyConfig = async () => {
  if (!activeConfig.value?._id) return;
  
  isApplying.value = true;
  applyError.value = null;
  
  try {
    const result = await configsStore.applyConfig(
      activeConfig.value._id,
      [props.serverId]
    );
    
    if (result && result.success) {
      showApplyConfirmModal.value = false;
      await loadServerConfig();
    } else {
      applyError.value = 'Failed to apply configuration';
    }
  } catch (err) {
    handleApplyConfigError(err);
  } finally {
    isApplying.value = false;
  }
};

// Update error handling in various methods, for example:
const handleApplyConfigError = (error) => {
  isLoading.value = false;
  
  // Extract meaningful error messages from various error formats
  let errorMessage = '';
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.message) {
    errorMessage = error.message;
  } else {
    errorMessage = 'An unknown error occurred';
  }
  
  // Check for specific Caddy errors
  if (errorMessage.includes('cannot unmarshal string into Go value of type map') &&
      errorMessage.includes('selection_policy')) {
    configErrors.value = `Error: Load balancing selection_policy must be an object with a "policy" field, not a string.
    
Example of correct format:
"load_balancing": {
  "selection_policy": {
    "policy": "round_robin"
  }
}

Instead of:
"load_balancing": {
  "selection_policy": "round_robin"
}`;
    
    showDetailedError.value = true;
  } else {
    configErrors.value = errorMessage;
  }

  // Display notification
  emit('show-notification', {
    type: 'error',
    message: `Failed to apply configuration: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`
  });
}

// Modify the template to include an error details section
const toggleErrorDetails = () => {
  showDetailedError.value = !showDetailedError.value;
};

// Watch for changes in serverId
watch(() => props.serverId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await loadServerConfig();
  }
});

onMounted(async () => {
  await loadServerConfig();
});
</script>

<style scoped>
/* Custom styling for structured content display */
.config-preview-section {
  max-height: 300px;
  overflow-y: auto;
}
</style>