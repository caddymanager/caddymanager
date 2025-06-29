import { defineStore } from 'pinia';
import authService from '../services/authService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: authService.getUser(),
    isAuthenticated: authService.isLoggedIn(),
    loading: false,
    error: null
  }),
  
  getters: {
    isAdmin: (state) => state.user && state.user.role === 'admin',
    username: (state) => state.user ? state.user.username : '',
    getUserRole: (state) => state.user ? state.user.role : '',
  },
  
  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.login(credentials);
        this.user = response.user;
        this.isAuthenticated = true;
        return response;
      } catch (error) {
        this.error = error.message || 'Login failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    logout() {
      authService.logout();
      this.user = null;
      this.isAuthenticated = false;
    },
    
    async fetchCurrentUser() {
      if (!authService.isLoggedIn()) {
        this.user = null;
        this.isAuthenticated = false;
        return null;
      }
      
      this.loading = true;
      
      try {
        const response = await authService.getCurrentUser();
        this.user = response.user;
        this.isAuthenticated = true;
        return response.user;
      } catch (error) {
        // If token is invalid or expired, logout
        if (error.message?.includes('Not authorized') || error.message?.includes('jwt')) {
          this.logout();
        }
        this.error = error.message || 'Failed to fetch user data';
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    async updateProfile(profileData) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.updateProfile(profileData);
        this.user = response.user;
        return response;
      } catch (error) {
        this.error = error.message || 'Failed to update profile';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async changePassword(passwordData) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.changePassword(passwordData);
        return response;
      } catch (error) {
        this.error = error.message || 'Failed to change password';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async getAllUsers() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.getAllUsers();
        return response;
      } catch (error) {
        this.error = error.message || 'Failed to fetch users';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateUserRole(userData) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.updateUserRole(userData);
        return response;
      } catch (error) {
        this.error = error.message || 'Failed to update user role';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async createUser(userData) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.createUser(userData);
        return response;
      } catch (error) {
        this.error = error.message || 'Failed to create user';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async deleteUser(userId) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await authService.deleteUser(userId);
        return response;
      } catch (error) {
        this.error = error.message || 'Failed to delete user';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    clearError() {
      this.error = null;
    }
  }
});