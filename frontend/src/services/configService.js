/**
 * Configuration service for accessing environment variables
 * This allows for centralized access to all environment variables
 * and provides default values if variables are not defined
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

// Application Settings
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Caddy Manager'

// Feature Flags
export const ENABLE_DARK_MODE = import.meta.env.VITE_ENABLE_DARK_MODE === 'true' || false

// Timeout settings (these could be moved to .env if needed)
export const API_TIMEOUT = 30000 // 30 seconds
export const AUTH_TOKEN_KEY = 'auth_token'

// Configuration object for easier imports
const config = {
  API: {
    BASE_URL: API_BASE_URL,
    TIMEOUT: API_TIMEOUT
  },
  APP: {
    TITLE: APP_TITLE
  },
  FEATURES: {
    DARK_MODE: ENABLE_DARK_MODE
  },
  STORAGE: {
    AUTH_TOKEN_KEY: AUTH_TOKEN_KEY
  }
}

export default config