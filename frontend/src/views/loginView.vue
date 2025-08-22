<template>
  <div class="min-h-screen w-full flex items-center justify-center breathing-background-gentle">
    <div class="login-container">
      <div class="login-form">
        <div class="flex justify-center mb-6">
          <img src="/Logo_Plain_SVG.png" alt="Caddy Manager Logo" class="h-36 w-36" />
        </div>
        <h1 class="text-2xl font-bold text-center mb-8">Caddy Manager</h1>
        
        <div v-if="authStore.error" class="p-3 mb-4 rounded-md bg-red-100 border border-red-300">
          <p class="text-red-700 text-sm">{{ authStore.error }}</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div class="form-group">
            <label for="username" class="block text-sm font-medium text-tertiary mb-1">Username</label>
            <input 
              type="text" 
              id="username" 
              v-model="username" 
              required 
              placeholder="Enter your username"
              class="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
          </div>
          
          <div class="form-group">
            <label for="password" class="block text-sm font-medium text-tertiary mb-1">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              required 
              placeholder="Enter your password"
              class="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              :disabled="authStore.loading"
            >
              <span v-if="authStore.loading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
              <span v-else>Sign in</span>
            </button>
          </div>
        </form>
        
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-400">
            Contact your administrator for access
          </p>
        </div>
      </div>
      
      <div class="mt-8 text-center text-xs text-gray-200">
        <p>&copy; {{ new Date().getFullYear() }} Caddy Manager. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useCaddyServersStore } from '../stores/caddyServersStore';
import { useCaddyConfigsStore } from '../stores/caddyConfigsStore';

const router = useRouter();
const authStore = useAuthStore();
const serversStore = useCaddyServersStore();
const configsStore = useCaddyConfigsStore();

const username = ref('');
const password = ref('');

onMounted(() => {
  // Clear any previous errors
  authStore.clearError();
  
  // If already authenticated, redirect to dashboard
  if (authStore.isAuthenticated) {
    router.push('/');
  }
});

const handleLogin = async () => {
  try {
    await authStore.login({
      username: username.value,
      password: password.value
    });

    // Refetch servers and configs after successful login
    await Promise.allSettled([
      serversStore.fetchServers(),
      configsStore.fetchAllConfigs()
    ]);
    
    // Redirect to dashboard on successful login
    router.push('/');
  } catch (error) {
    // Error is already handled in the store
    console.error('Login failed:', error);
  }
};
</script>

<style scoped>
.login-container {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.login-form {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 2rem;
}
</style>