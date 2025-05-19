<script setup>
import { ref, onBeforeMount, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SidebarComp from './components/navigation/sidebarComp.vue'
import LoadingSpinnerComp from './components/util/loadingSpinnerComp.vue'
import { useCaddyServersStore } from './stores/caddyServersStore'
import { useCaddyConfigsStore } from './stores/caddyConfigsStore'
import { useThemeStore } from './stores/themeStore'
import config from './services/configService'

// Loading state that starts as true
const isLoading = ref(true)
const isLoadingAnimation = ref(true) // For controlling fade-out animation
const showMainContent = ref(false) // To control main content fade-in
const initError = ref(null)

// Get the current route to determine layout
const route = useRoute()

// Computed property to determine if we should show the sidebar
const showSidebar = computed(() => {
  // List of routes that should be full screen without sidebar
  const fullScreenRoutes = ['/login', '/register']
  return !fullScreenRoutes.includes(route.path)
})

// Store instances
const serversStore = useCaddyServersStore()
const configsStore = useCaddyConfigsStore()
const themeStore = useThemeStore()

// Initialize application
const initializeApp = async () => {
  try {
    console.log(`Initializing ${config.APP.TITLE} from App.vue...`)
    
    // Fetch initial data
    console.log('Fetching initial application data...')
    
    // Start both fetch operations in parallel
    await Promise.allSettled([
      serversStore.fetchServers(),
      configsStore.fetchAllConfigs()
    ])
    
    console.log('Initial data fetching complete')
    console.log(`${config.APP.TITLE} initialized successfully`)
    
    // Finish loading with animation
    finishLoading()
  } catch (error) {
    console.error('Error during application initialization:', error)
    initError.value = error.message || 'Failed to initialize application'
    
    // Still finish loading even if there's an error
    finishLoading()
  }
}

// Handle finish loading and animations
const finishLoading = () => {
  // First trigger the fade-out animation
  isLoadingAnimation.value = false
  
  // Then remove the element from DOM after animation completes
  setTimeout(() => {
    isLoading.value = false
    // After loading screen is gone, show and fade in the main content
    showMainContent.value = true
  }, 1000) // Match this with the CSS transition duration
}

// Start initialization when component is created
onBeforeMount(() => {
  // Start initialization
  initializeApp()
})
</script>

<template>
  <notifications />

  <!-- Loading overlay - shown when isLoading is true -->
  <div v-if="isLoading" 
       class="loading-screen fixed inset-0 z-50 flex items-center justify-center"
       :class="{ 'fade-out': !isLoadingAnimation }">
    <div class="breathing-background absolute inset-0"></div>
    <div class="relative z-10 text-center">
      <LoadingSpinnerComp 
        size="large" 
        color="gradient" 
        caption="Initializing your environment...">
        <h2 class="text-3xl font-medium text-white mb-1">Caddy Manager</h2>
        <p v-if="initError" class="mt-4 text-red-300 max-w-md">{{ initError }}</p>
      </LoadingSpinnerComp>
    </div>
  </div>

  <!-- Main app content with fade-in animation -->
  <div class="main-content-wrapper" :class="{ 'fade-in': showMainContent }">
    <!-- Conditionally render the sidebar based on the route -->
    <template v-if="showSidebar">
      <SidebarComp>
        <RouterView />
      </SidebarComp>
    </template>
    
    <!-- Full screen layout without sidebar for login and similar pages -->
    <template v-else>
      <div class="full-screen-view">
        <RouterView />
      </div>
    </template>
  </div>
</template>

<style>
html, body {
  height: 100%;
}

/* Enhanced loading screen styles */
.loading-screen {
  transition: opacity 1s ease-out;
}

.fade-out {
  opacity: 0;
}

/* Main content fade in */
.main-content-wrapper {
  opacity: 0;
  transition: opacity 0.8s ease-in;
  height: 100%;
}

.fade-in {
  opacity: 1;
}

/* Full screen view styles */
.full-screen-view {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.breathing-background {
  background: linear-gradient(135deg, #1e40af, #1e3a8a, #7f1d1d, #991b1b);
  background-size: 400% 400%;
  animation: gradient-animation 10s ease infinite;
}

.breathing-background-gentle {
  background: linear-gradient(135deg, #1e3a8a, #1e40af, #7f1d1d, #991b1b);
  background-size: 400% 400%;
  animation: gradient-animation 30s ease infinite;
}

.breathing-background-strong {
  background: linear-gradient(135deg, #1e3a8a, #1e40af, #7f1d1d, #991b1b);
  background-size: 400% 400%;
  animation: gradient-animation 5s ease infinite;
}

@keyframes gradient-animation {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
