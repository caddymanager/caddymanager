<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 flex items-center justify-center z-50">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/70" @click="cancelAction"></div>
      
      <!-- Dialog content -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 overflow-hidden">
        <div class="bg-gray-50 border-b border-gray-100 p-4">
          <h3 class="m-0 font-semibold flex items-center justify-between">
            <div class="flex items-center">
              <CodeBracketIcon class="h-5 w-5 mr-2 text-tertiary" />
              Configuration Details
            </div>
            <button type="button" @click="cancelAction" class="text-gray-400 hover:text-gray-500">
              <span class="sr-only">Close</span>
              <XMarkIcon class="h-6 w-6" />
            </button>
          </h3>
        </div>
        
        <div class="p-4">
          <div v-if="isLoading" class="flex justify-center items-center h-[300px]">
            <LoadingSpinnerComp 
              caption="Loading configuration..."
              color="gradient"
              size="medium"
              text-color="text-gray-500"
            />
          </div>
          
          <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
            {{ error }}
          </div>
          
          <div v-else class="flex flex-col h-full">
            <!-- Configuration View Panel with structured and JSON views -->
            <div class="bg-white rounded-lg border-none flex-1">
              <div class="bg-gray-50 border-b border-gray-100 p-4">
                <h5 class="m-0 font-semibold flex items-center justify-between">
                  <div class="flex items-center">
                    <CodeBracketIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
                    Configuration Content
                  </div>
                  <div class="flex items-center space-x-2">
                    <!-- View mode toggle -->
                    <div class="flex border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                      <button
                        type="button"
                        class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                        :class="viewMode === 'structured' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                        @click="viewMode = 'structured'"
                      >
                        <TableCellsIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Structured
                      </button>
                      <button
                        type="button"
                        class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                        :class="viewMode === 'json' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                        @click="viewMode = 'json'"
                      >
                        <CodeBracketSquareIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        JSON
                      </button>
                    </div>
                  </div>
                </h5>
              </div>
              
              <div class="p-4 border-none overflow-auto" style="max-height: 500px;">
                <!-- Structured View Mode -->
                <div v-if="viewMode === 'structured' && configContent" class="h-full">
                  <!-- Sites overview -->
                  <div v-if="hasSiteDefinitions" class="mb-6">
                    <h3 class="text-md font-semibold text-tertiary mb-3">Sites</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div v-for="(site, index) in parsedSites" :key="index" 
                          class="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                          <h4 class="text-base font-medium text-secondary">
                            <GlobeAltIcon class="inline-block h-4 w-4 mr-1 text-tertiary" aria-hidden="true" />
                            {{ site.hostnames.join(', ') }}
                          </h4>
                          <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {{ site.type }}
                          </span>
                        </div>
                        <div class="text-sm text-gray-600">
                          <div class="flex items-start mb-1">
                            <div class="font-medium text-tertiary w-20">Proxy to:</div>
                            <div>{{ site.upstreamTargets.join(', ') }}</div>
                          </div>
                          <div v-if="site.listen && site.listen.length" class="flex items-start mb-1">
                            <div class="font-medium text-tertiary w-20">Listen on:</div>
                            <div>{{ site.listen.join(', ') }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="hasListenAddresses" class="my-6">
                    <h3 class="text-md font-semibold text-tertiary mb-3">Listen Addresses</h3>
                    <div class="flex flex-wrap gap-2">
                      <span v-for="(address, i) in parsedListenAddresses" :key="i" 
                        class="inline-flex items-center rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                        {{ address }}
                      </span>
                    </div>
                  </div>
                  
                  <div v-if="hasAdminConfig" class="my-6">
                    <h3 class="text-md font-semibold text-tertiary mb-3">Admin Configuration</h3>
                    <div class="bg-gray-50 rounded-md p-3">
                      <div class="flex items-center mb-2">
                        <ShieldCheckIcon class="h-5 w-5 text-tertiary mr-2" />
                        <span class="font-medium text-tertiary">Admin Endpoint</span>
                      </div>
                      <div class="pl-7 text-sm">
                        <div class="mb-1"><span class="font-medium text-tertiary">Listen:</span> {{ parsedAdminConfig.listen || 'Default' }}</div>
                        <div v-if="parsedAdminConfig.enforce_origin">
                          <span class="font-medium text-tertiary">Enforce Origin:</span> {{ parsedAdminConfig.enforce_origin }}
                        </div>
                        <div v-if="parsedAdminConfig.origins && parsedAdminConfig.origins.length">
                          <span class="font-medium text-tertiary">Allowed Origins:</span> {{ parsedAdminConfig.origins.join(', ') }}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="hasLoggingConfig" class="my-6">
                    <h3 class="text-md font-semibold text-tertiary mb-3">Logging Configuration</h3>
                    <div v-for="(log, name) in parsedLoggingConfig" :key="name" 
                        class="bg-gray-50 rounded-md p-3 mb-2">
                      <div class="flex items-center mb-2">
                        <DocumentTextIcon class="h-5 w-5 text-tertiary mr-2" />
                        <span class="font-medium text-tertiary">{{ name }}</span>
                      </div>
                      <div class="pl-7 text-sm">
                        <div class="mb-1"><span class="font-medium text-tertiary">Level:</span> {{ log.level }}</div>
                        <div v-if="log.output" class="mb-1">
                          <span class="font-medium text-tertiary">Output:</span> {{ log.output }}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="!hasSiteDefinitions && !hasAdminConfig && !hasLoggingConfig" class="text-center py-8 text-gray-500">
                    <InformationCircleIcon class="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p>No structured data could be parsed from this configuration.</p>
                    <p class="text-sm mt-1">Try viewing in JSON mode for the raw configuration.</p>
                  </div>
                </div>
                
                <!-- JSON View Mode -->
                <div v-else-if="viewMode === 'json' && configContent" class="h-full">
                  <VueJsonPretty
                    :data="configContent"
                    :deep="25"
                    :show-double-quotes="true"
                    :show-length="true"
                    :show-line="true"
                    :show-icon="true"
                    class="json-viewer"
                  />
                </div>
                
                <div v-else class="flex items-center justify-center h-40 text-gray-500">
                  No configuration content available
                </div>
              </div>
            </div>

            <div class="mt-4 flex justify-between">
              <div>
                <button
                  @click="editConfig"
                  class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <PencilIcon class="h-4 w-4 mr-1" />
                  Edit Configuration
                </button>
              </div>
              
              <button
                @click="cancelAction"
                class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';
import {
  CodeBracketIcon,
  XMarkIcon,
  TableCellsIcon,
  CodeBracketSquareIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  PencilIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  configId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);
const router = useRouter();
const configsStore = useCaddyConfigsStore();

// State variables
const isLoading = ref(false);
const error = ref(null);
const viewMode = ref('structured');

// Get the configuration from the store
const config = computed(() => configsStore.getConfigById(props.configId));

// Watch for changes in modelValue to load data when the modal opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.configId) {
    await loadConfig();
  }
});

// Fetch the configuration when needed
async function loadConfig() {
  if (!props.configId) return;
  
  isLoading.value = true;
  error.value = null;
  
  try {
    if (!config.value) {
      await configsStore.fetchConfigById(props.configId);
    }
  } catch (err) {
    error.value = `Failed to load configuration: ${err.message}`;
    console.error('Error loading configuration:', err);
  } finally {
    isLoading.value = false;
  }
}

// Get the configuration content
const configContent = computed(() => {
  if (!config.value) return null;
  
  // Try to get the content from different possible locations
  if (config.value.content && typeof config.value.content === 'object') {
    return config.value.content;
  }
  
  if (config.value.jsonConfig && typeof config.value.jsonConfig === 'object') {
    return config.value.jsonConfig;
  }
  
  // If content is a JSON string, parse it
  if (config.value.content && typeof config.value.content === 'string') {
    try {
      return JSON.parse(config.value.content);
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
          
          // Include listen addresses
          const listen = serverConfig.listen || [];
          
          // Only add if we have hostnames
          if (hostnames.length) {
            sites.push({
              serverName,
              hostnames,
              type,
              upstreamTargets: upstreamTargets.length ? upstreamTargets : ['No target specified'],
              listen,
              options
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

const hasSiteDefinitions = computed(() => parsedSites.value.length > 0);

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

const hasListenAddresses = computed(() => parsedListenAddresses.value.length > 0);

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

// Extract logging configuration
const parsedLoggingConfig = computed(() => {
  if (!configContent.value) return {};
  
  try {
    return configContent.value?.logging?.logs || {};
  } catch (err) {
    console.error('Error parsing logging config:', err);
    return {};
  }
});

const hasLoggingConfig = computed(() => Object.keys(parsedLoggingConfig.value).length > 0);

// Close modal
const cancelAction = () => {
  emit('update:modelValue', false);
};

// Navigate to edit configuration page
const editConfig = () => {
  if (props.configId) {
    router.push({ name: 'editConfig', params: { id: props.configId } });
    emit('update:modelValue', false);
  }
};
</script>

<style scoped>
/* Custom styling for vue-json-pretty */
:deep(.json-viewer) {
  font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 13px;
}
</style>