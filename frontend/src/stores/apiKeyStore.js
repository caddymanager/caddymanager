import { defineStore } from 'pinia';
import apiKeyService from '../services/apiKeyService';

export const useApiKeyStore = defineStore('apiKey', {
  state: () => ({
    apiKeys: [],
    currentApiKey: null,
    newlyCreatedKey: null, // Store newly created key temporarily
    loading: false,
    error: null
  }),
  
  getters: {
    getApiKeyById: (state) => (id) => {
      return state.apiKeys.find(key => key._id === id);
    },
    
    hasActiveKeys: (state) => {
      return state.apiKeys.some(key => key.isActive);
    }
  },
  
  actions: {
    async fetchApiKeys() {
      this.loading = true;
      this.error = null;
      
      try {
        console.log('Fetching API keys...');
        const response = await apiKeyService.getApiKeys();
        console.log('API keys response:', response);
        
        // Make sure we have an array of API keys
        this.apiKeys = response.apiKeys || [];
        
        return this.apiKeys;
      } catch (error) {
        console.error('Error fetching API keys:', error);
        this.error = error.message || 'Failed to fetch API keys';
        this.apiKeys = []; // Reset to empty array on error
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchApiKey(id) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await apiKeyService.getApiKey(id);
        this.currentApiKey = response.apiKey;
        return response.apiKey;
      } catch (error) {
        console.error(`Error fetching API key ${id}:`, error);
        this.error = error.message || 'Failed to fetch API key details';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async createApiKey(keyData) {
      this.loading = true;
      this.error = null;
      this.newlyCreatedKey = null;
      
      try {
        console.log('Creating API key with data:', keyData);
        const response = await apiKeyService.createApiKey(keyData);
        console.log('Create API key response:', response);
        
        // Add to list
        if (response.apiKey) {
          this.apiKeys.unshift(response.apiKey);
          this.newlyCreatedKey = response.apiKey;
        } else {
          console.warn('API key created but no key data in response:', response);
        }
        
        return response.apiKey;
      } catch (error) {
        console.error('Error creating API key:', error);
        this.error = error.message || 'Failed to create API key';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateApiKey(id, keyData) {
      this.loading = true;
      this.error = null;
      
      try {
        console.log(`Updating API key ${id} with data:`, keyData);
        const response = await apiKeyService.updateApiKey(id, keyData);
        
        // Update in list
        const index = this.apiKeys.findIndex(key => key._id === id);
        if (index !== -1) {
          this.apiKeys[index] = response.apiKey;
        }
        
        return response.apiKey;
      } catch (error) {
        console.error(`Error updating API key ${id}:`, error);
        this.error = error.message || 'Failed to update API key';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async deleteApiKey(id) {
      this.loading = true;
      this.error = null;
      
      try {
        console.log(`Deleting API key ${id}`);
        await apiKeyService.deleteApiKey(id);
        
        // Remove from list
        this.apiKeys = this.apiKeys.filter(key => key._id !== id);
        return true;
      } catch (error) {
        console.error(`Error deleting API key ${id}:`, error);
        this.error = error.message || 'Failed to delete API key';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    clearNewlyCreatedKey() {
      this.newlyCreatedKey = null;
    },
    
    clearError() {
      this.error = null;
    }
  }
});