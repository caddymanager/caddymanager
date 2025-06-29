<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import ServersCardsComp from '@/components/servers/serversCardsComp.vue'
import ServersTableComp from '@/components/servers/serversTableComp.vue'
import ServersCreateModalComp from '@/components/servers/serversCreateModalComp.vue'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import { useThemeStore } from '@/stores/themeStore'
import { useRouter } from 'vue-router'
import { useNotification } from "@kyvg/vue3-notification";


// Initialize stores and router
const serversStore = useCaddyServersStore()
const themeStore = useThemeStore()
const router = useRouter()

// Notification setup
const { notify } = useNotification()

// View state (cards or table) from theme store
const currentView = ref(themeStore.getViewPreference('servers'))

// Add server modal state
const showAddServerModal = ref(false)

// Handle view toggle
const handleViewToggle = (view) => {
  currentView.value = view
  themeStore.setViewPreference('servers', view)
}

// Add server handler
const handleAddServer = () => {
  showAddServerModal.value = true
}

// Server created/added handler
const handleServerCreated = async (newServer) => {  
  // Show notification for new server
  notify({
    title: "Success",
    text: "Server added successfully!",
    type: "success"
  });
  
  // Refresh the servers list
  await handleRefresh()
}

// Handle server deleted
const handleServerDeleted = async (serverId) => {  
  // Show notification for server deletion
  notify({
    title: "Success",
    text: "Server deleted successfully!",
    type: "success"
  });
  
  // The store already removes the server from the servers array,
  // but we can refresh just to make sure everything is in sync
  await handleRefresh()
}

// Refresh servers
const handleRefresh = async () => {
  await serversStore.fetchServers()
  // After fetching servers, check their status
  if (serversStore.servers.length > 0) {
    await serversStore.checkAllServersStatus()
  }
}

// Start polling when the view is mounted
onMounted(() => {
  // Start polling with a 30-second interval
  serversStore.startPolling(30000);
})

// Clean up when the view is unmounted
onBeforeUnmount(() => {
  // Stop polling when leaving this view
  serversStore.stopPolling();
})
</script>

<template>
  <div>
    <!-- Page header with title, actions, and view toggle -->
    <PageTitleComp 
      title="Caddy Servers" 
      :breadcrumbs="[
        { name: 'Home', path: '/' },
        { name: 'Servers', path: '/servers' }
      ]"
      :primaryButton="{ 
        text: 'Add Server', 
        action: handleAddServer
      }"
      :additionalButtons="[
        { 
          text: 'Refresh', 
          action: handleRefresh,
          variant: 'secondary'
        }
      ]"
      :showViewToggle="true"
      :currentView="currentView"
      :isLoading="serversStore.isLoading"
      @change-view="handleViewToggle"
    />

    <!-- Conditional rendering based on view -->
    <div v-if="currentView === 'cards'">
      <ServersCardsComp 
        :servers="serversStore.servers"
        :isLoading="serversStore.isLoading"
        :error="serversStore.error"
        @add-server="handleAddServer"
        @server-deleted="handleServerDeleted"
      />
    </div>
    <div v-else>
      <ServersTableComp 
        :servers="serversStore.servers"
        :isLoading="serversStore.isLoading"
        :error="serversStore.error"
        @add-server="handleAddServer"
        @server-deleted="handleServerDeleted"
      />
    </div>
    
    <!-- Server creation modal -->
    <ServersCreateModalComp 
      v-model="showAddServerModal"
      @server-created="handleServerCreated"
      @server-added="handleServerCreated"
    />
  </div>
</template>

<style scoped>
</style>