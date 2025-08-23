import axios from 'axios'
import config from './configService'
import router from '@/router'

/**
 * Returns a preconfigured axios instance for API calls
 * Uses the latest config for each request
 */
function getApiClient() {
  const apiClient = axios.create({
    baseURL: config.API.BASE_URL, // getter, always up-to-date
    timeout: config.API.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  apiClient.interceptors.request.use(
    (reqConfig) => {
      const token = localStorage.getItem(config.STORAGE.AUTH_TOKEN_KEY)
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`
      }
      return reqConfig
    },
    (error) => Promise.reject(error)
  )

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        switch (error.response.status) {
          case 401:
            // Unauthorized: clear auth via authService and redirect to login
            console.error('Unauthorized access, logging out and redirecting to login')
            // Use dynamic import of the Pinia auth store so its state is updated
            // (authStore.logout() calls authService.logout() internally)
            import('@/stores/authStore')
              .then((m) => {
                try {
                  const useAuthStore = m.useAuthStore
                  if (useAuthStore) {
                    const authStore = useAuthStore()
                    if (authStore && typeof authStore.logout === 'function') {
                      authStore.logout()
                    }
                  }
                } catch (e) {
                  // ignore errors from store logout
                }
              })
              .catch(() => {})

            try {
              const current = router && router.currentRoute && router.currentRoute.value
              if (!current || current.name !== 'login') {
                router.push({ name: 'login' })
              }
            } catch (e) {
              // ignore routing errors
            }

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
        console.error('No response from server')
      } else {
        console.error('Error setting up request:', error.message)
      }
      return Promise.reject(error)
    }
  )

  return apiClient
}

/**
 * API service with common CRUD operations
 * Always uses a fresh axios instance with the latest config
 */
const apiService = {
  get(endpoint, params = {}) {
    return getApiClient().get(endpoint, { params })
  },
  post(endpoint, data = {}, config = {}) {
    return getApiClient().post(endpoint, data, config)
  },
  put(endpoint, data = {}, config = {}) {
    return getApiClient().put(endpoint, data, config)
  },
  patch(endpoint, data = {}) {
    return getApiClient().patch(endpoint, data)
  },
  delete(endpoint) {
    return getApiClient().delete(endpoint)
  },
  async getSwaggerDocs() {
    try {
      const response = await this.get('/docs/swagger.json');
      return response.data;
    } catch (error) {
      console.error('Error fetching Swagger documentation:', error);
      throw error;
    }
  }
}

export default apiService