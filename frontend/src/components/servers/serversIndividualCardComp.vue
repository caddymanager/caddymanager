<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ServerIcon, EllipsisHorizontalIcon, ArrowPathIcon, EyeIcon, CogIcon } from '@heroicons/vue/24/outline'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import ModalConfirm from '@/components/modals/modalConfirmComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

const props = defineProps({
  server: {
    type: Object,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  enablePolling: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['serverDeleted', 'statusUpdated'])

const serversStore = useCaddyServersStore()
const configsStore = useCaddyConfigsStore()

// Get active configuration for this server
const activeConfig = computed(() => configsStore.getConfigByServer(props.server._id))

// Local state
const serverStatus = ref(props.server.status || 'unknown')
const lastPinged = ref(props.server.lastPinged)
const isStatusChecking = ref(false)
const isMenuOpen = ref(false)
const menuRef = ref(null)
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const deleteError = ref(null)

// Timer for updating the time display
const timeUpdateTimer = ref(null)
// Local reactive time display string
const timeDisplayString = ref('')

// Watch for server status changes
watch(() => props.server.status, (newStatus) => {
  if (newStatus !== serverStatus.value) {
    serverStatus.value = newStatus
    emit('statusUpdated', { id: props.server._id, status: newStatus })
  }
})

// Watch for lastPinged changes from the parent
watch(() => props.server.lastPinged, (newTime) => {
  if (newTime !== lastPinged.value) {
    console.log(`Last pinged changed from ${lastPinged.value} to ${newTime}`)
    lastPinged.value = newTime
    // Immediately update the display time when lastPinged changes
    updateTimeDisplay()
  }
}, { immediate: true })

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString()
}

// Function to update time display
const updateTimeDisplay = () => {
  if (!lastPinged.value) {
    timeDisplayString.value = 'Never'
    return
  }
  
  const now = new Date()
  const lastPingTime = new Date(lastPinged.value)
  const diffMs = now - lastPingTime
  
  // Less than a minute
  if (diffMs < 60000) {
    timeDisplayString.value = 'Just now'
    return
  }
  
  // Less than an hour
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000)
    timeDisplayString.value = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
    return
  }
  
  // Less than a day
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000)
    timeDisplayString.value = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    return
  }
  
  // More than a day
  const days = Math.floor(diffMs / 86400000)
  timeDisplayString.value = `${days} ${days === 1 ? 'day' : 'days'} ago`
}

// Check server status manually
const checkServerStatus = async () => {
  if (isStatusChecking.value) return
  
  isStatusChecking.value = true
  try {
    const status = await serversStore.checkServerStatus(props.server._id)
    serverStatus.value = status
    // After checking status, refresh the lastPinged value from the store
    const updatedServer = serversStore.getServerById(props.server._id)
    if (updatedServer && updatedServer.lastPinged) {
      lastPinged.value = updatedServer.lastPinged
      updateTimeDisplay()
    }
    emit('statusUpdated', { id: props.server._id, status })
  } catch (error) {
    console.error('Error checking server status:', error)
  } finally {
    isStatusChecking.value = false
  }
}

// Start the timer for time display updates and polling when component is mounted
onMounted(() => {
  // Initial update
  updateTimeDisplay()
  
  // Set up timer to update the display every 30 seconds
  timeUpdateTimer.value = setInterval(() => {
    updateTimeDisplay()
  }, 30000) // Update every 30 seconds
  
  // Start polling if enabled
  if (props.enablePolling && !serversStore.isPollingEnabled) {
    serversStore.startPolling()
  }
})

// Clean up resources when component is unmounted
onBeforeUnmount(() => {
  // Clear the time update timer
  if (timeUpdateTimer.value) {
    clearInterval(timeUpdateTimer.value)
    timeUpdateTimer.value = null
  }
  
  // Clean up polling
  if (!document.querySelector('.server-card-component')) {
    serversStore.cleanupPolling()
  }
})

// Custom directive for handling clicks outside an element
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  }
}

const toggleMenu = (event) => {
  event.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
}

// Close the menu when clicking outside
const closeMenu = (event) => {
  // Don't close if clicking inside the menu or the toggle button
  if (menuRef.value && menuRef.value.contains(event.target)) {
    return
  }
  
  // Check if the click was on the menu toggle button
  const menuToggleButton = event.target.closest('button');
  if (menuToggleButton && menuToggleButton.getAttribute('aria-label') === 'Open options') {
    return;
  }
  
  if (!showDeleteConfirm.value) {
    isMenuOpen.value = false
  }
}

// Handle menu item click
const handleMenuItemClick = (action, event) => {
  if (action !== 'delete') {
    isMenuOpen.value = false
    return
  }
  
  // For delete, show confirmation
  event.preventDefault()
  event.stopPropagation()
  showDeleteConfirm.value = true
  isMenuOpen.value = false
}

// Handle delete confirmation
const confirmDelete = async () => {
  if (isDeleting.value) return
  
  isDeleting.value = true
  deleteError.value = null
  
  try {
    await serversStore.deleteServer(props.server._id)
    emit('serverDeleted', props.server._id)
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('Error deleting server:', error)
    deleteError.value = error.message || 'An error occurred during deletion'
  } finally {
    isDeleting.value = false
  }
}

// Status badge styling based on server status
const statusClass = computed(() => {
  switch (props.server.status) {
    case 'online':
      return 'bg-accent-2 text-green-700 ring-green-600/20'
    case 'offline':
      return 'bg-red-50 text-red-700 ring-red-600/10'
    case 'restarting':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10'
  }
})

// Check if server has tags
const hasTags = computed(() => {
  return props.server.tags && Array.isArray(props.server.tags) && props.server.tags.length > 0
})
</script>

<template>
  <div class="server-card-component" :data-server-id="server._id">
  <li class="overflow-hidden rounded-xl border border-gray-200 relative">
    <!-- Loading overlay -->
    <div v-if="props.isLoading" class="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
      <LoadingSpinnerComp 
        caption="Loading..."
        color="gradient"
        size="small"
        text-color="text-gray-500"
      />
    </div>
  
    <!-- Card header with server info and menu -->
    <div class="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6">
      <!-- Server icon or logo -->
      <div class="flex items-center justify-center size-12 flex-none rounded-lg bg-white shadow ring-1 ring-gray-900/10">
        <ServerIcon class="size-6 text-primary" aria-hidden="true" />
      </div>
      
      <!-- Server name - now clickable -->
      <RouterLink :to="`/servers/${server._id}`" class="text-sm/6 font-medium text-secondary truncate flex-1 hover:text-primary group">
        <span class="group-hover:underline">{{ server.name }}</span>
      </RouterLink>
      
      <!-- Dropdown menu -->
      <div class="relative" v-click-outside="closeMenu">
        <button type="button" class="-m-2.5 block p-2.5 text-gray-400 hover:text-gray-500" @click="toggleMenu">
          <span class="sr-only">Open options</span>
          <EllipsisHorizontalIcon class="size-5" aria-hidden="true" />
        </button>

        <!-- Dropdown menu content -->
        <transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <div 
            v-if="isMenuOpen" 
            ref="menuRef"
            class="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-hidden" 
            role="menu" 
            @click.stop
          >
            <RouterLink :to="`/servers/${server._id}`" class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" role="menuitem" @click="handleMenuItemClick('view', $event)">View</RouterLink>
            <RouterLink :to="`/servers/${server._id}/edit`" class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" role="menuitem" @click="handleMenuItemClick('edit', $event)">Edit</RouterLink>
            <RouterLink 
              :to="activeConfig ? { name: 'configDetails', params: { id: activeConfig._id } } : { name: 'configs', query: { server: server._id } }" 
              class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" 
              role="menuitem" 
              @click="handleMenuItemClick('config', $event)"
            >
              Config
            </RouterLink>
            <button @click="handleMenuItemClick('delete', $event)" class="w-full text-left px-3 py-1 text-sm/6 text-red-600 hover:bg-red-50" role="menuitem">Delete</button>
          </div>
        </transition>
      </div>
    </div>
    
    <!-- Card content with server details -->
    <dl class="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
      <!-- API URL -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">API URL</dt>
        <dd class="text-tertiary truncate max-w-[180px]">{{ server.apiUrl }}:{{ server.apiPort }}</dd>
      </div>
      
      <!-- Last Contacted -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Last Contact</dt>
        <dd class="flex flex-col text-tertiary">
          <span>{{ timeDisplayString }}</span>
          <span class="text-xs text-gray-400" :title="formatDate(lastPinged)">{{ formatDate(lastPinged) }}</span>
        </dd>
      </div>
      
      <!-- Status -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Status</dt>
        <dd class="flex items-start gap-x-2">
          <div class="font-medium text-gray-900 flex items-center">
            {{ serverStatus || 'Unknown' }}
            <button
              @click="checkServerStatus"
              class="ml-2 inline-flex items-center text-gray-500 hover:text-tertiary focus:outline-none"
              title="Check status"
            >
              <ArrowPathIcon 
                class="h-4 w-4" 
                :class="{ 'animate-spin': isStatusChecking || serversStore.isPolling }" 
                aria-hidden="true" 
              />
            </button>
          </div>
          <div :class="[statusClass, 'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset']">
            {{ server.active ? 'Active' : 'Inactive' }}
          </div>
        </dd>
      </div>
      
      <!-- Server type badge -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Type</dt>
        <dd class="text-tertiary">
          <span v-if="server.existingInstance" class="inline-flex items-center rounded-md bg-tertiary/20 px-1.5 py-0.5 text-xs font-medium text-tertiary ring-1 ring-inset ring-tertiary/30">Existing</span>
          <span v-else class="inline-flex items-center rounded-md bg-secondary/20 px-1.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/30">Managed</span>
        </dd>
      </div>
      
      <!-- Tags -->
      <div v-if="hasTags" class="flex flex-col gap-y-2 py-3">
        <dt class="text-gray-500">Tags</dt>
        <dd class="flex flex-wrap gap-1">
          <span
            v-for="(tag, index) in server.tags"
            :key="index"
            class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
          >
            {{ tag }}
          </span>
        </dd>
      </div>
    </dl>
    
    <!-- Card footer with actions -->
    <div class="border-t border-gray-100 px-6 py-3 bg-gray-50">
      <div class="flex justify-between">
        <RouterLink 
          :to="`/servers/${server._id}`" 
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-secondary bg-white border border-gray-200 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
        >
          <EyeIcon class="h-4 w-4 mr-1.5" aria-hidden="true" />
          View Details
        </RouterLink>
        
        <RouterLink 
          :to="activeConfig ? { name: 'configDetails', params: { id: activeConfig._id } } : { name: 'configs', query: { server: server._id } }" 
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-secondary bg-white border border-gray-200 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
        >
          <CogIcon class="h-4 w-4 mr-1.5" aria-hidden="true" />
          Config
        </RouterLink>
      </div>
    </div>

    <!-- Use our new reusable confirmation modal -->
    <ModalConfirm
      v-model="showDeleteConfirm"
      title="Delete Server"
      :message="`Are you sure you want to delete the server '${server.name}'? This action cannot be undone.`"
      :error="deleteError"
      confirm-text="Delete"
      processing-text="Deleting..."
      :is-processing="isDeleting"
      @confirm="confirmDelete"
    />
  </li>
  </div>
</template>