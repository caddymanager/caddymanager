import apiService from './apiService';

/**
 * Service for interacting with Swagger documentation
 */
const swaggerService = {
  /**
   * Fetch the Swagger documentation from the API
   */
  async getSwaggerDocs() {
    try {
      return await apiService.getSwaggerDocs();
    } catch (error) {
      console.error('Error fetching Swagger documentation:', error);
      throw error;
    }
  },

  /**
   * Get endpoints grouped by tag/category
   * @returns {Promise<Object>} - Object with endpoints grouped by tag
   */
  async getEndpointsByTag() {
    const swagger = await this.getSwaggerDocs();
    const endpoints = {};

    // Check if swagger has paths
    if (!swagger || !swagger.paths) {
      console.warn('Invalid Swagger documentation received', swagger);
      return {};
    }

    // Process paths and operations
    Object.entries(swagger.paths).forEach(([path, operations]) => {
      Object.entries(operations).forEach(([method, operation]) => {
        // Skip if no tags defined
        if (!operation.tags || operation.tags.length === 0) return;

        // Use the first tag as the category
        const tag = operation.tags[0];
        
        if (!endpoints[tag]) {
          endpoints[tag] = [];
        }
        
        // Get required permissions from security requirements if available
        let requiredPermissions = [];
        if (operation.security && operation.security.length > 0) {
          // Extract permission scopes from security object
          operation.security.forEach(secObj => {
            Object.values(secObj).forEach(scopes => {
              if (scopes && scopes.length > 0) {
                requiredPermissions = [...requiredPermissions, ...scopes];
              }
            });
          });
        }
        
        // If no explicit permissions are defined but security is required, assume 'read' permission
        if (requiredPermissions.length === 0 && operation.security && operation.security.length > 0) {
          requiredPermissions = ['read'];
        }
        
        endpoints[tag].push({
          path,
          method: method.toUpperCase(),
          summary: operation.summary || '',
          description: operation.description || '',
          operationId: operation.operationId,
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses,
          requiredPermissions
        });
      });
    });

    return endpoints;
  },

  /**
   * Get API Key specific endpoints
   * @returns {Promise<Array>} - Array of API Key endpoints
   */
  async getApiKeyEndpoints() {
    const endpointsByTag = await this.getEndpointsByTag();
    
    // Look for endpoints related to API keys
    // Check for any of these tags that might be related to API keys
    const possibleApiKeyTags = ['API Keys', 'apiKeys', 'API Keys Management'];
    
    let apiKeyEndpoints = [];
    
    // Check if any of our possible tags exist in the endpoints
    for (const tag of possibleApiKeyTags) {
      if (endpointsByTag[tag]) {
        apiKeyEndpoints = endpointsByTag[tag];
        break;
      }
    }
    
    // If we still don't have endpoints, look for endpoints with 'apikey' in the path
    if (apiKeyEndpoints.length === 0) {
      Object.values(endpointsByTag).forEach(tagEndpoints => {
        tagEndpoints.forEach(endpoint => {
          if (endpoint.path.toLowerCase().includes('apikey')) {
            apiKeyEndpoints.push(endpoint);
          }
        });
      });
    }
    
    return apiKeyEndpoints;
  },
  
  /**
   * Generate API examples for documentation
   * @returns {Object} - Object containing examples in different languages
   */
  generateApiExamples(baseUrl) {
    const apiKey = 'your_api_key_here';
    
    return {
      nodejs: `const axios = require('axios');

const API_KEY = '${apiKey}';
const BASE_URL = '${baseUrl}';

// Get all servers
async function getServers() {
  try {
    const response = await axios.get(\`\${BASE_URL}/api/v1/caddy/servers\`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching servers:', error);
    throw error;
  }
}`,

      python: `import requests

API_KEY = '${apiKey}'
BASE_URL = '${baseUrl}'

# Get all servers
def get_servers():
    headers = {
        'X-API-Key': API_KEY
    }
    response = requests.get(f'{BASE_URL}/api/v1/caddy/servers', headers=headers)
    response.raise_for_status()
    return response.json()`,

      curl: `curl -X GET \\
  "${baseUrl}/api/v1/caddy/servers" \\
  -H "X-API-Key: ${apiKey}"`
    };
  }
};

export default swaggerService;