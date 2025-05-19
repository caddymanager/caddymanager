<script setup>
import { ref, onMounted } from 'vue'
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import ConfigurationsCardsComp from '@/components/configurations/configurationsCardsComp.vue'
import ConfigurationsTableComp from '@/components/configurations/configurationsTableComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import { useThemeStore } from '@/stores/themeStore'
import { useRouter, useRoute } from 'vue-router'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

// Initialize stores and router
const configsStore = useCaddyConfigsStore()
const serversStore = useCaddyServersStore()
const themeStore = useThemeStore()
const router = useRouter()
const route = useRoute()

// View state (cards or table) from theme store
const currentView = ref(themeStore.getViewPreference('configs'))

// Get the server ID from the route if available
const serverId = ref(route.query.server || null)

// Refresh state
const isRefreshing = ref(false)

// Handle view toggle
const handleViewToggle = (view) => {
  currentView.value = view
  themeStore.setViewPreference('configs', view)
}

// Add configuration handler
const handleAddConfig = () => {
  router.push({ name: 'createConfig' })
}

// Refresh configurations
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    if (serverId.value) {
      // If we have a server ID, fetch configs for that server
      await configsStore.fetchConfigsForServer(serverId.value)
    } else {
      // Otherwise fetch all configs
      await configsStore.fetchAllConfigs()
    }
  } catch (error) {
    console.error('Error refreshing configurations:', error)
  } finally {
    isRefreshing.value = false
  }
}

// Get page title based on context
const getPageTitle = () => {
  if (serverId.value) {
    const server = serversStore.getServerById(serverId.value)
    if (server) {
      return `Configurations for ${server.name}`
    }
  }
  return 'Configurations'
}

// Generate breadcrumbs based on context
const getBreadcrumbs = () => {
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Configurations', path: '/configs' }
  ]
  
  if (serverId.value) {
    const server = serversStore.getServerById(serverId.value)
    if (server) {
      crumbs.splice(1, 0, { name: 'Servers', path: '/servers' })
      crumbs.splice(2, 0, { name: server.name, path: `/servers/${serverId.value}` })
    }
  }
  
  return crumbs
}

// Handle configuration delete success
const handleConfigDeleted = async () => {
  await handleRefresh()
}

// Lifecycle hooks
onMounted(async () => {
  isRefreshing.value = true
  try {
    // First load servers to get server names
    if (serversStore.servers.length === 0) {
      await serversStore.fetchServers()
    }
    
    // Then load configurations
    if (serverId.value) {
      await configsStore.fetchConfigsForServer(serverId.value)
    } else {
      await configsStore.fetchAllConfigs()
    }
  } catch (error) {
    console.error('Error loading initial data:', error)
  } finally {
    isRefreshing.value = false
  }
})
</script>

<template>
  <div>
    <!-- Page header with title, actions, and view toggle -->
    <PageTitleComp 
      :title="getPageTitle()" 
      :breadcrumbs="getBreadcrumbs()"
      :primaryButton="{ 
        text: 'Add Configuration', 
        action: handleAddConfig
      }"
      :additionalButtons="[
        { 
          text: isRefreshing ? 'Refreshing...' : 'Refresh', 
          action: handleRefresh,
          variant: 'secondary',
          disabled: isRefreshing,
          icon: isRefreshing ? ArrowPathIcon : null,
          iconClass: isRefreshing ? 'animate-spin -ml-1 mr-2 h-4 w-4' : ''
        }
      ]"
      :showViewToggle="true"
      :currentView="currentView"
      :isLoading="configsStore.isLoading || isRefreshing"
      @change-view="handleViewToggle"
    />

    <!-- Loading indicator for refreshing -->
    <div v-if="isRefreshing && !configsStore.configs.length" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading configurations..."
        color="gradient"
        size="medium"
      />
    </div>

    <!-- Conditional rendering based on view -->
    <div v-else>
      <!-- Handle delete events from both card and table components -->
      <div v-if="currentView === 'cards'">
        <ConfigurationsCardsComp 
          :configs="configsStore.configs"
          :servers="serversStore.servers"
          :isLoading="configsStore.isLoading"
          :error="configsStore.error"
          @add-config="handleAddConfig"
          @delete-success="handleConfigDeleted"
        />
      </div>
      <div v-else>
        <ConfigurationsTableComp 
          :configs="configsStore.configs"
          :servers="serversStore.servers"
          :isLoading="configsStore.isLoading"
          :error="configsStore.error"
          @delete-success="handleConfigDeleted"
        />
      </div>
    </div>
  </div>
</template>