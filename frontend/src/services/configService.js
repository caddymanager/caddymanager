/**
 * Configuration service for accessing environment variables and dynamic /config endpoint
 * Loads <frontend base url>/config at runtime and falls back to environment variables if not present
 */

let runtimeConfig = null

// Loads <frontend base url>/config and populates runtimeConfig
export async function loadConfig() {
  try {
    // Use window.location.origin to get the frontend base URL
    const configUrl = window.location.origin + '/config'
    const res = await fetch(configUrl)
    if (!res.ok) throw new Error('Failed to load ' + configUrl)
    runtimeConfig = await res.json()
  } catch (e) {
    // If /config fails, runtimeConfig remains null and env vars will be used
    runtimeConfig = null
  }
}

function getConfigValue(key, envVar, fallback) {
  if (runtimeConfig && runtimeConfig[key] !== undefined) return runtimeConfig[key]
  if (import.meta.env[envVar] !== undefined) return import.meta.env[envVar]
  return fallback
}

// API Configuration
export function getApiBaseUrl() {
  return getConfigValue('api_base_url', 'VITE_API_BASE_URL', 'http://localhost:3000/api/v1')
}

// Application Settings
export function getAppTitle() {
  return getConfigValue('app_name', 'VITE_APP_TITLE', 'Caddy Manager')
}

// Feature Flags
export function isDarkModeEnabled() {
  const val = getConfigValue('enable_dark_mode', 'VITE_ENABLE_DARK_MODE', 'false')
  return val === true || val === 'true'
}

// Timeout settings (these could be moved to .env if needed)
export const API_TIMEOUT = 30000 // 30 seconds
export const AUTH_TOKEN_KEY = 'auth_token'

// Configuration object for easier imports
const config = {
  API: {
    get BASE_URL() { return getApiBaseUrl() },
    TIMEOUT: API_TIMEOUT
  },
  APP: {
    get TITLE() { return getAppTitle() }
  },
  FEATURES: {
    get DARK_MODE() { return isDarkModeEnabled() }
  },
  STORAGE: {
    AUTH_TOKEN_KEY: AUTH_TOKEN_KEY
  }
}

export default config