import apiService from './apiService';
import config from './configService';

// API Key endpoint path
const API_KEY_ENDPOINT = `/apikeys`;

// Create a new API key
const createApiKey = async (apiKeyData) => {
  try {
    const response = await apiService.post(API_KEY_ENDPOINT, apiKeyData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get all API keys for the current user
const getApiKeys = async () => {
  try {
    const response = await apiService.get(API_KEY_ENDPOINT);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get a single API key by ID
const getApiKey = async (apiKeyId) => {
  try {
    const response = await apiService.get(`${API_KEY_ENDPOINT}/${apiKeyId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update an API key
const updateApiKey = async (apiKeyId, updateData) => {
  try {
    const response = await apiService.put(`${API_KEY_ENDPOINT}/${apiKeyId}`, updateData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete an API key
const deleteApiKey = async (apiKeyId) => {
  try {
    const response = await apiService.delete(`${API_KEY_ENDPOINT}/${apiKeyId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Admin: Get all API keys across all users
const getAllApiKeys = async () => {
  try {
    const response = await apiService.get(`${API_KEY_ENDPOINT}/admin/all`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Admin: Revoke an API key
const revokeApiKey = async (apiKeyId) => {
  try {
    const response = await apiService.put(`${API_KEY_ENDPOINT}/admin/revoke/${apiKeyId}`, {});
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Error handler
const handleApiError = (error) => {
  const errorMessage = error.response?.data?.message || 
    error.message || 
    'An unknown error occurred';
  
  return {
    message: errorMessage,
    status: error.response?.status || 500
  };
};

export default {
  createApiKey,
  getApiKeys,
  getApiKey,
  updateApiKey,
  deleteApiKey,
  getAllApiKeys,
  revokeApiKey
};