import axios from 'axios'
import config from './configService'

/**
 * Create a preconfigured axios instance for API calls
 */
const apiClient = axios.create({
  baseURL: config.API.BASE_URL,
  timeout: config.API.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

/**
 * Request interceptor
 * - Adds authentication token if available
 * - Can be extended for other request processing
 */
apiClient.interceptors.request.use(
  (reqConfig) => {
    // Use the imported config module, not the reqConfig parameter
    const token = localStorage.getItem(config.STORAGE.AUTH_TOKEN_KEY)
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`
    }
    return reqConfig
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor
 * - Handles common error scenarios
 * - Can be extended for response processing
 */
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle specific error codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Handle unauthorized (e.g., redirect to login)
          console.error('Unauthorized access, please login')
          // Could dispatch to auth store to handle logout/redirect
          break
        case 403:
          console.error('Forbidden access')
          break
        case 404:
          console.error('Resource not found')
          break
        case 500:
          console.error('Server error')
          break
        default:
          console.error(`API Error: ${error.response.status}`)
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from server')
    } else {
      // Something else caused the error
      console.error('Error setting up request:', error.message)
    }
    return Promise.reject(error)
  }
)

/**
 * API service with common CRUD operations
 */
const apiService = {
  // GET request
  get(endpoint, params = {}) {
    return apiClient.get(endpoint, { params })
  },

  // POST request with optional custom config
  post(endpoint, data = {}, config = {}) {
    return apiClient.post(endpoint, data, config)
  },

  // PUT request with optional custom config
  put(endpoint, data = {}, config = {}) {
    return apiClient.put(endpoint, data, config)
  },

  // PATCH request
  patch(endpoint, data = {}) {
    return apiClient.patch(endpoint, data)
  },

  // DELETE request
  delete(endpoint) {
    return apiClient.delete(endpoint)
  },

  // Direct access to the Axios instance if needed
  client: apiClient,

  // Get Swagger documentation
  async getSwaggerDocs() {
    // Use the existing get method instead of creating a new axios instance
    try {
      const response = await this.get('/docs/swagger.json');
      return response.data;
    } catch (error) {
      console.error('Error fetching Swagger documentation:', error);
      throw error;
    }
  }
}

export default {
  ...apiService,
  getSwaggerDocs: apiService.getSwaggerDocs,
}