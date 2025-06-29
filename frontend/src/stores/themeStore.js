import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Store for managing UI theme preferences
 * Handles storing and retrieving user interface preferences
 * Uses Pinia's persistence plugin to automatically save to localStorage
 */
export const useThemeStore = defineStore('theme', () => {
  // State
  const viewPreference = ref({
    servers: 'cards',
    configs: 'cards',
  })
  
  /**
   * Set the view preference for a specific section
   * @param {string} section - The section name (e.g., 'servers', 'configs')
   * @param {string} type - The view type ('cards' or 'table')
   */
  function setViewPreference(section, type) {
    if (section && (type === 'cards' || type === 'table')) {
      viewPreference.value[section] = type
    }
  }

  /**
   * Get the view preference for a specific section
   * @param {string} section - The section name (e.g., 'servers', 'configs')
   * @returns {string} - The view type ('cards' or 'table')
   */
  function getViewPreference(section) {
    return viewPreference.value[section] || 'cards' // Default to cards
  }

  return {
    viewPreference,
    setViewPreference,
    getViewPreference
  }
}, {
  persist: true,
})