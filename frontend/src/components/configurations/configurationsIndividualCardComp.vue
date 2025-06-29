<script setup>
import { ref, computed, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { DocumentTextIcon, EllipsisHorizontalIcon, ServerIcon, ArrowPathIcon, EyeIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import ModalConfirm from '@/components/modals/modalConfirmComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'
import ModalApplyConfig from './modalApplyConfigComp.vue'

// Initialize the config store
const configsStore = useCaddyConfigsStore()

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  serverName: {
    type: [String, Array],
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Format server names for display
const formattedServerNames = computed(() => {
  if (Array.isArray(props.serverName)) {
    return props.serverName.length > 0 
      ? props.serverName.join(', ') 
      : 'No servers'
  }
  return props.serverName || 'No server'
})

// Show tooltip for long server names list
const shouldShowTooltip = computed(() => {
  if (Array.isArray(props.serverName)) {
    return props.serverName.length > 1
  }
  return false
})

const emit = defineEmits(['delete-success', 'apply-success'])

const isMenuOpen = ref(false)
const menuRef = ref(null)
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const deleteError = ref(null)

// Apply config modal state
const showApplyModal = ref(false)
const applySuccess = ref(false)
const applyMessage = ref('')

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

const toggleMenu = () => {
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
  
  isMenuOpen.value = false
}

// Handle delete action
const handleDelete = async () => {
  if (isDeleting.value) return
  
  isDeleting.value = true
  deleteError.value = null
  
  try {
    const success = await configsStore.deleteConfig(props.config._id)
    if (success) {
      showDeleteConfirm.value = false
      emit('delete-success', props.config._id)
    } else {
      deleteError.value = 'Failed to delete configuration'
    }
  } catch (error) {
    deleteError.value = error.message || 'An error occurred while deleting'
  } finally {
    isDeleting.value = false
  }
}

// Show the apply modal
const openApplyModal = () => {
  showApplyModal.value = true
  isMenuOpen.value = false
}

// Handle successful apply
const handleApplySuccess = (result) => {
  applySuccess.value = true
  applyMessage.value = `Configuration applied to ${result.serverIds.length} server(s).`
  emit('apply-success', result)
  
  // Auto-hide the success message after a delay
  setTimeout(() => {
    applySuccess.value = false
  }, 3000)
}

// Format badge for status
const statusClass = computed(() => {
  switch (props.config.status) {
    case 'live':
      return 'bg-accent-2 text-green-700 ring-green-600/20'
    case 'draft':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20'
    case 'archived':
      return 'bg-gray-50 text-tertiary ring-gray-600/10'
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10'
  }
})

// Format badges for format
const formatClass = computed(() => {
  switch (props.config.format) {
    case 'json':
      return 'bg-purple-50 text-purple-700 ring-purple-600/20'
    case 'caddyfile':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10'
  }
})

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'Not available'
  return new Date(dateString).toLocaleString()
}
</script>

<template>
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
    
    <!-- Card header with config info and menu -->
    <div class="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6">
      <!-- Config icon -->
      <div class="flex items-center justify-center size-12 flex-none rounded-lg bg-white shadow ring-1 ring-gray-900/10">
        <DocumentTextIcon 
          v-if="config.format === 'caddyfile'" 
          class="size-6 text-primary" 
          aria-hidden="true" 
        />
        <DocumentTextIcon 
          v-else 
          class="size-6 text-accent-1" 
          aria-hidden="true" 
        />
      </div>
      
      <!-- Config name and format badge - Now clickable -->
      <RouterLink :to="`/configs/${config._id}`" class="text-sm/6 font-medium text-secondary truncate flex-1 hover:text-primary group">
        <span class="group-hover:underline">{{ config.name }}</span>
        <span 
          :class="[formatClass, 'ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset']"
        >
          {{ config.format }}
        </span>
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
          >
            <RouterLink :to="`/configs/${config._id}`" class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" role="menuitem">View</RouterLink>
            <RouterLink :to="`/configs/${config._id}/edit`" class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" role="menuitem">Edit</RouterLink>
            <button 
              @click="openApplyModal" 
              class="block w-full text-left px-3 py-1 text-sm/6 text-green-600 hover:bg-green-50" 
              role="menuitem"
            >
              Apply
            </button>
            <button 
              @click="showDeleteConfirm = true; isMenuOpen = false" 
              class="block w-full text-left px-3 py-1 text-sm/6 text-red-600 hover:bg-red-50" 
              role="menuitem"
            >
              Delete
            </button>
          </div>
        </transition>
      </div>
    </div>
    
    <!-- Card content with config details -->
    <dl class="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
      <!-- Server -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Server</dt>
        <dd class="flex items-center gap-1">
          <ServerIcon class="size-4 text-tertiary" />
          <span class="text-tertiary truncate max-w-[180px]" :title="shouldShowTooltip ? formattedServerNames : ''">{{ formattedServerNames }}</span>
        </dd>
      </div>
      
      <!-- Description -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Description</dt>
        <dd class="text-tertiary truncate max-w-[180px]">
          {{ config.metadata?.description || 'No description' }}
        </dd>
      </div>
      
      <!-- Last Updated -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Last Updated</dt>
        <dd class="text-tertiary">{{ formatDate(config.updatedAt) }}</dd>
      </div>
      
      <!-- Status and Live indicator -->
      <div class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Status</dt>
        <dd class="flex items-start gap-x-2">
          <div class="font-medium text-gray-900">{{ config.status }}</div>
          <div v-if="config.liveOnServers && config.liveOnServers.length > 0" class="inline-flex items-center rounded-md bg-accent-2 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Live
          </div>
        </dd>
      </div>
      
      <!-- Tags -->
      <div v-if="config.metadata && config.metadata.tags && config.metadata.tags.length > 0" class="flex justify-between gap-x-4 py-3">
        <dt class="text-gray-500">Tags</dt>
        <dd class="text-tertiary">
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="(tag, index) in config.metadata.tags" 
              :key="index"
              class="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
            >
              {{ tag }}
            </span>
          </div>
        </dd>
      </div>
    </dl>
    
    <!-- Card footer with actions -->
    <div class="border-t border-gray-100 px-6 py-3 bg-gray-50">
      <div class="flex justify-between">
        <RouterLink 
          :to="`/configs/${config._id}`" 
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-secondary bg-white border border-gray-200 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
        >
          <EyeIcon class="h-4 w-4 mr-1.5" aria-hidden="true" />
          View Details
        </RouterLink>
        
        <!-- Apply button -->
        <button
          @click="openApplyModal"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
          :disabled="props.isLoading"
        >
          <CloudArrowUpIcon class="h-4 w-4 mr-1.5" aria-hidden="true" />
          Apply
        </button>
        
        <!-- Deletion status indicator -->
        <div v-if="isDeleting" class="flex items-center">
          <ArrowPathIcon class="animate-spin h-4 w-4 text-accent-1 mr-1" aria-hidden="true" />
          <span class="text-xs text-gray-500">Deleting...</span>
        </div>
      </div>
      
      <!-- Success message toast -->
      <div 
        v-if="applySuccess" 
        class="mt-2 py-1.5 px-3 bg-green-100 border border-green-200 rounded text-green-700 text-xs"
      >
        {{ applyMessage }}
      </div>
    </div>

    <!-- Confirmation modal for deletion -->
    <ModalConfirm
      v-model="showDeleteConfirm"
      title="Delete Configuration"
      :message="`Are you sure you want to delete the configuration '${config.name}'? This action cannot be undone.`"
      :error="deleteError"
      confirm-text="Delete"
      processing-text="Deleting..."
      :is-processing="isDeleting"
      @confirm="handleDelete"
    />
    
    <!-- Apply configuration modal -->
    <ModalApplyConfig
      v-model="showApplyModal"
      :config="config"
      @success="handleApplySuccess"
    />
  </li>
</template>

<script>
// Custom directive for handling clicks outside an element
export default {
  directives: {
    'click-outside': {
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
  }
}
</script>