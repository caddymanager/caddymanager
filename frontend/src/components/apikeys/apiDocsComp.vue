<template>
  <div class="text-sm">
    <h2 class="text-xl font-semibold text-tertiary">CaddyManager API Documentation</h2>
    
    <!-- Loading state for docs -->
    <div v-if="docsLoading" class="mt-5">
      <span>Loading API documentation...</span>
    </div>
    
    <!-- Error state for docs -->
    <div v-if="docsError" class="mt-5 text-red-600">
      {{ docsError }}
      <button @click="fetchApiDocs" class="ml-2.5 bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600">
        Retry
      </button>
    </div>
    
    <div v-if="!docsLoading && !docsError">
      <div class="mb-8 mt-5">
        <h3 class="text-lg font-medium mb-4 pb-1 border-b border-gray-200">Authentication</h3>
        <p>
          All API requests must be authenticated using one of the following methods:
        </p>
        
        <div class="bg-gray-50 p-4 rounded-md mt-4">
          <h4 class="font-medium">Using Authorization Header</h4>
          <pre class="bg-gray-100 p-3 rounded-md mt-1 overflow-x-auto">Authorization: ApiKey YOUR_API_KEY</pre>
          
          <h4 class="font-medium mt-2.5">Using X-API-Key Header</h4>
          <pre class="bg-gray-100 p-3 rounded-md mt-1 overflow-x-auto">X-API-Key: YOUR_API_KEY</pre>
        </div>
      </div>
      
      <div class="mb-8">
        <h3 class="text-lg font-medium mb-4 pb-1 border-b border-gray-200">Base URL</h3>
        <p>All API endpoints are relative to: <code class="bg-gray-100 px-2 py-1 rounded">{{ apiBaseUrl }}</code></p>
      </div>
      
      <div class="mb-8">
        <h3 class="text-lg font-medium mb-4 pb-1 border-b border-gray-200">Endpoints</h3>
        
        <div v-for="(endpoints, category) in groupedEndpoints" :key="category" class="mb-5">
          <h4 class="font-medium text-lg mb-2">{{ formatCategoryName(category) }}</h4>
          
          <!-- Endpoints accordion -->
          <div v-for="(endpoint, index) in endpoints" :key="index" class="border border-gray-200 rounded-md mb-3">
            <div 
              class="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
              @click="toggleEndpointDetails(category, index)"
            >
              <div class="flex items-center">
                <span 
                  :class="[
                    'inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold rounded',
                    endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' : 
                    endpoint.method === 'POST' ? 'bg-green-100 text-green-800' : 
                    endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-800' : 
                    endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ endpoint.method }}
                </span>
                <code class="font-mono">{{ endpoint.path }}</code>
              </div>
              <ChevronDownIcon 
                class="h-5 w-5 text-gray-500 transition-transform"
                :class="{'rotate-180': expandedEndpoints[`${category}-${index}`]}"
              />
            </div>
            
            <!-- Endpoint details -->
            <div v-if="expandedEndpoints[`${category}-${index}`]" class="border-t border-gray-200 p-4">
              <p class="mb-3">{{ endpoint.summary || endpoint.description || 'No description available' }}</p>
              
              <!-- Parameters -->
              <div v-if="endpoint.parameters && endpoint.parameters.length > 0" class="mb-4">
                <h5 class="font-medium text-tertiary mb-2">Parameters</h5>
                <table class="min-w-full border-collapse border border-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="py-2 px-3 border border-gray-200 text-left text-xs">Name</th>
                      <th class="py-2 px-3 border border-gray-200 text-left text-xs">In</th>
                      <th class="py-2 px-3 border border-gray-200 text-left text-xs">Required</th>
                      <th class="py-2 px-3 border border-gray-200 text-left text-xs">Type</th>
                      <th class="py-2 px-3 border border-gray-200 text-left text-xs">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="param in endpoint.parameters" :key="param.name" class="hover:bg-gray-50">
                      <td class="py-2 px-3 border border-gray-200"><code class="text-xs">{{ param.name }}</code></td>
                      <td class="py-2 px-3 border border-gray-200 text-xs">{{ param.in }}</td>
                      <td class="py-2 px-3 border border-gray-200 text-xs">{{ param.required ? 'Yes' : 'No' }}</td>
                      <td class="py-2 px-3 border border-gray-200 text-xs">{{ param.type || param.schema?.type || '-' }}</td>
                      <td class="py-2 px-3 border border-gray-200 text-xs">{{ param.description || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Request Body -->
              <div v-if="endpoint.requestBody" class="mb-4">
                <h5 class="font-medium text-tertiary mb-2">Request Body</h5>
                <div v-if="endpoint.requestBody.content && endpoint.requestBody.content['application/json']" class="bg-gray-50 p-3 rounded-md">
                  <div class="mb-2">
                    <span class="text-xs font-medium">Required: </span>
                    <span class="text-xs">{{ endpoint.requestBody.required ? 'Yes' : 'No' }}</span>
                  </div>
                  <div v-if="endpoint.requestBody.description" class="mb-2 text-xs">
                    {{ endpoint.requestBody.description }}
                  </div>
                  <div class="mb-2">
                    <span class="text-xs font-medium">Schema:</span>
                  </div>
                  <pre class="bg-gray-100 p-3 rounded-md text-xs overflow-auto">{{ formatJsonSchema(endpoint.requestBody.content['application/json'].schema) }}</pre>
                </div>
              </div>
              
              <!-- Responses -->
              <div class="mb-4">
                <h5 class="font-medium text-tertiary mb-2">Responses</h5>
                <div v-for="(response, status) in endpoint.responses" :key="status" class="mb-3">
                  <div class="flex items-center mb-1">
                    <span 
                      :class="[
                        'inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold rounded',
                        status.startsWith('2') ? 'bg-green-100 text-green-800' : 
                        status.startsWith('4') ? 'bg-amber-100 text-amber-800' : 
                        status.startsWith('5') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      ]"
                    >
                      {{ status }}
                    </span>
                    <span class="text-xs">{{ response.description }}</span>
                  </div>
                  
                  <div v-if="response.content && response.content['application/json']" class="ml-8">
                    <div class="mb-1">
                      <span class="text-xs font-medium">Response Schema:</span>
                    </div>
                    <pre class="bg-gray-100 p-3 rounded-md text-xs overflow-auto">{{ formatJsonSchema(response.content['application/json'].schema) }}</pre>
                  </div>
                </div>
              </div>
              
              <!-- Required Permissions -->
              <div class="mb-2">
                <h5 class="font-medium text-tertiary mb-2">Required Permissions</h5>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="permission in endpoint.requiredPermissions" 
                    :key="permission"
                    :class="[
                      'inline-block px-2 py-1 rounded-md text-xs font-medium',
                      permission === 'read' ? 'bg-blue-50 text-blue-700' : 
                      permission === 'write' ? 'bg-yellow-50 text-yellow-700' : 
                      permission === 'delete' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                    ]"
                  >
                    {{ permission }}
                  </span>
                  <span v-if="!endpoint.requiredPermissions || endpoint.requiredPermissions.length === 0" class="text-xs text-gray-500">
                    No specific permissions required
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-8">
        <h3 class="text-lg font-medium mb-4 pb-1 border-b border-gray-200">Response Format</h3>
        <p>All API responses follow a consistent format:</p>
        <pre class="bg-gray-100 p-3 rounded-md mt-3 mb-4 overflow-x-auto whitespace-pre-wrap break-all">{
  "success": true,
  "data": { /* Response data */ },
  "message": "Optional message"
}</pre>
        
        <h4 class="font-medium mt-4">Error Responses</h4>
        <pre class="bg-gray-100 p-3 rounded-md mt-2 overflow-x-auto whitespace-pre-wrap break-all">{
  "success": false,
  "message": "Error message describing what went wrong",
  "error": "Optional detailed error information"
}</pre>
      </div>
      
      <div class="mb-8">
        <h3 class="text-lg font-medium mb-4 pb-1 border-b border-gray-200">Example API Usage</h3>
        <div class="bg-gray-50 p-4 rounded-md">
          <h4 class="font-medium mb-2">Node.js Example</h4>
          <pre class="bg-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">{{ apiExamples.nodejs }}</pre>

          <h4 class="font-medium mb-2 mt-4">Python Example</h4>
          <pre class="bg-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">{{ apiExamples.python }}</pre>

          <h4 class="font-medium mb-2 mt-4">cURL Example</h4>
          <pre class="bg-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">{{ apiExamples.curl }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import swaggerService from '../../services/swaggerService';
import config from '../../services/configService';

// Props
const props = defineProps({
  apiBaseUrl: {
    type: String,
    default: () => config.API.BASE_URL
  }
});

// State for API documentation
const docsLoading = ref(false);
const docsError = ref(null);
const endpoints = ref({});
const apiExamples = ref({
  nodejs: '',
  python: '',
  curl: ''
});
const expandedEndpoints = ref({});

// Computed property to group endpoints by category
const groupedEndpoints = computed(() => {
  return endpoints.value;
});

// Watch for changes to apiBaseUrl prop
watch(() => props.apiBaseUrl, (newValue) => {
  if (newValue && newValue !== '') {
    apiExamples.value = swaggerService.generateApiExamples(newValue);
  }
}, { immediate: true });

// Methods
const formatCategoryName = (name) => {
  if (!name) return 'Other';
  
  // Convert camelCase or snake_case to Title Case with spaces
  return name
    .replace(/_/g, ' ')         // Replace underscores with spaces
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
};

const toggleEndpointDetails = (category, index) => {
  const key = `${category}-${index}`;
  expandedEndpoints.value[key] = !expandedEndpoints.value[key];
};

const formatJsonSchema = (schema) => {
  if (!schema) return '{}';
  
  try {
    // Handle references or complex schemas
    if (schema.$ref) {
      return `{ "$ref": "${schema.$ref}" }`;
    }
    
    // For readability, we'll create a simplified version of the schema
    const simplifiedSchema = {};
    
    if (schema.type) {
      simplifiedSchema.type = schema.type;
    }
    
    if (schema.properties) {
      simplifiedSchema.properties = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        simplifiedSchema.properties[key] = {
          type: prop.type || 'object',
          description: prop.description || ''
        };
        
        // Handle nested objects
        if (prop.properties) {
          simplifiedSchema.properties[key].properties = '{ ... }';
        }
        
        // Handle arrays
        if (prop.type === 'array' && prop.items) {
          simplifiedSchema.properties[key].items = prop.items.type || 'object';
        }
      }
    }
    
    if (schema.required) {
      simplifiedSchema.required = schema.required;
    }
    
    return JSON.stringify(simplifiedSchema, null, 2);
  } catch (error) {
    console.error('Error formatting schema:', error);
    return '{}';
  }
};

const fetchApiDocs = async () => {
  docsLoading.value = true;
  docsError.value = null;
  
  try {
    console.log("Fetching API docs...");
    // Fetch all endpoints grouped by tag
    const endpointsByTag = await swaggerService.getEndpointsByTag();
    console.log("Received endpoints:", endpointsByTag);
    endpoints.value = endpointsByTag;
    
    // Generate API examples
    apiExamples.value = swaggerService.generateApiExamples(props.apiBaseUrl);
    console.log("API documentation loaded successfully");
  } catch (error) {
    console.error('Failed to fetch API documentation:', error);
    docsError.value = 'Failed to load API documentation. Please try again later.';
  } finally {
    docsLoading.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  fetchApiDocs();
});

// Expose methods
defineExpose({
  fetchApiDocs
});
</script>