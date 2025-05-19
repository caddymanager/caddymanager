<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowPathIcon, EyeIcon, PencilIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline';
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore';
import { useCaddyServersStore } from '@/stores/caddyServersStore';
import ModalConfirm from '@/components/modals/modalConfirmComp.vue';
import ModalApplyConfig from './modalApplyConfigComp.vue';
import NoConfigurationsFoundComp from './noConfigurationsFoundComp.vue';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';

const props = defineProps({
  configs: {
    type: Array,
    required: true,
  },
  servers: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  serverId: {
    type: String,
    default: null
  },
  format: {
    type: String,
    default: null
  },
  searchTerm: {
    type: String,
    default: ''
  },
  sortBy: {
    type: String,
    default: 'updatedAt'
  },
  sortDirection: {
    type: String,
    default: 'desc'
  }
});

const emit = defineEmits(['apply-config', 'delete-success', 'apply-success']);

// Delete confirmation modal state
const configToDelete = ref(null);
const showDeleteConfirm = ref(false);
const deleteError = ref(null);
const isDeleting = ref(false);

// Apply configuration modal state
const configToApply = ref(null);
const showApplyModal = ref(false);

const confirmDeleteConfig = (config) => {
  configToDelete.value = config;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  if (isDeleting.value || !configToDelete.value) return;
  
  isDeleting.value = true;
  deleteError.value = null;
  
  try {
    const success = await configsStore.deleteConfig(configToDelete.value._id);
    if (success) {
      showDeleteConfirm.value = false;
      emit('delete-success', configToDelete.value._id);
      
      // Show success message
      successMessage.value = `Configuration "${configToDelete.value.name}" was deleted successfully`;
      showSuccessMessage.value = true;
      
      // Hide success message after a delay
      setTimeout(() => {
        showSuccessMessage.value = false;
      }, 3000);
    } else {
      deleteError.value = 'Failed to delete configuration';
    }
  } catch (error) {
    deleteError.value = error.message || 'An error occurred while deleting';
  } finally {
    isDeleting.value = false;
  }
};

const openApplyModal = (config) => {
  configToApply.value = config;
  showApplyModal.value = true;
};

const handleApplySuccess = (result) => {
  emit('apply-success', result);
  
  // Show success message
  successMessage.value = `Configuration "${result.config.name}" was applied successfully to ${result.serverIds.length} server(s)`;
  showSuccessMessage.value = true;
  
  // Hide success message after a delay
  setTimeout(() => {
    showSuccessMessage.value = false;
  }, 3000);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Helper function to get server name by ID
const getServerNameById = (serverId) => {
  // Check if server is already an object with name property
  if (serverId && typeof serverId === 'object' && serverId.name) {
    return serverId.name;
  }
  
  // Otherwise find it in servers array
  const server = props.servers.find(s => s._id === serverId);
  return server ? server.name : 'N/A';
};

// Computed property to format configuration format for display
const getFormatClass = (format) => {
  switch(format) {
    case 'json':
      return 'bg-purple-50 text-purple-700 ring-purple-600/20';
    case 'caddyfile':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10';
  }
};

// Computed property to format configuration status for display
const getStatusClass = (status) => {
  switch(status) {
    case 'live':
      return 'bg-accent-2 text-green-700 ring-green-600/20';
    case 'draft':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    case 'archived':
      return 'bg-gray-50 text-tertiary ring-gray-600/10';
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10';
  }
};

// Store initialization
const configsStore = useCaddyConfigsStore();
const serversStore = useCaddyServersStore();

// Local state
const loading = ref(true);
const sortField = ref(props.sortBy);
const sortOrder = ref(props.sortDirection);

// Success message for deletion
const showSuccessMessage = ref(false);
const successMessage = ref('');

// Load configs based on props
const loadConfigs = async () => {
  loading.value = true;
  try {
    if (props.serverId) {
      await configsStore.fetchConfigsForServer(props.serverId);
    } else {
      await configsStore.fetchAllConfigs();
    }
  } catch (error) {
    console.error('Failed to load configurations:', error);
  } finally {
    loading.value = false;
  }
};

// Get server names as a formatted string
const getServerName = (config) => {
  // If config has servers array with server objects that include names
  if (config.servers && Array.isArray(config.servers)) {
    // First try to get names directly from server objects
    const serverNames = config.servers
      .map(server => {
        if (typeof server === 'object' && server.name) {
          return server.name;
        } 
        
        // If only ID is available, look up in props.servers
        const serverId = typeof server === 'object' ? server._id : server;
        const serverObj = props.servers.find(s => s._id === serverId);
        return serverObj ? serverObj.name : 'N/A';
      })
      .filter(Boolean);
    
    if (serverNames.length > 0) {
      return serverNames.join(', ');
    }
  }
  
  // Check if config has server object with name
  if (config.server && typeof config.server === 'object' && config.server.name) {
    return config.server.name;
  }
  
  // Check if we have a serverId to look up
  let serverId = null;
  
  // Try to get serverId from different possible locations
  if (config.serverId) {
    serverId = config.serverId;
  } else if (config.server && typeof config.server === 'string') {
    serverId = config.server;
  }
  
  // If we have a serverId, try to look it up
  if (serverId) {
    const server = props.servers.find(s => s._id === serverId) || serversStore.getServerById(serverId);
    if (server) return server.name;
  }
  
  return 'N/A';
};

// Filter and sort configurations
const filteredConfigs = computed(() => {
  let result = [...configsStore.configs];
  
  // Filter by server if specified
  if (props.serverId) {
    result = result.filter(config => config.serverId === props.serverId);
  }
  
  // Filter by format if specified
  if (props.format) {
    result = result.filter(config => config.format === props.format);
  }
  
  // Apply search filter
  if (props.searchTerm) {
    const searchLower = props.searchTerm.toLowerCase();
    result = result.filter(config => 
      config.name.toLowerCase().includes(searchLower) || 
      (config.metadata?.description && config.metadata.description.toLowerCase().includes(searchLower)) ||
      (config.metadata?.tags && config.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  }
  
  // Apply sorting
  result.sort((a, b) => {
    let valA, valB;
    
    // Determine values to compare based on sort field
    switch (sortField.value) {
      case 'name':
        valA = a.name;
        valB = b.name;
        break;
      case 'format':
        valA = a.format;
        valB = b.format;
        break;
      case 'status':
        valA = a.status;
        valB = b.status;
        break;
      case 'createdAt':
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
      default:
        valA = new Date(a.updatedAt || a.createdAt).getTime();
        valB = new Date(b.updatedAt || b.createdAt).getTime();
        break;
    }
    
    // Determine sort direction
    const modifier = sortOrder.value === 'asc' ? 1 : -1;
    
    // Compare string values
    if (typeof valA === 'string' && typeof valB === 'string') {
      return modifier * valA.localeCompare(valB);
    }
    
    // Compare numeric values
    return modifier * (valA - valB);
  });
  
  return result;
});

// Toggle sort order when clicking on the same field
const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc'; // Default to descending when changing fields
  }
};

// Watch for prop changes
watch(() => [props.serverId, props.format, props.searchTerm], () => {
  loadConfigs();
}, { deep: true });

// Initial data load
onMounted(async () => {
  await Promise.all([
    serversStore.fetchServers(),
    loadConfigs()
  ]);
  loading.value = false;
});
</script>

<template>
  <div>
    <!-- Success message toast -->
    <div 
      v-if="showSuccessMessage" 
      class="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 animate-fade-in-out"
    >
      {{ successMessage }}
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading configurations..."
        color="gradient"
        size="small"
        text-color="text-gray-500"
      />
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- Empty state -->
    <NoConfigurationsFoundComp v-else-if="filteredConfigs.length === 0" />
    
    <!-- Configurations table -->
    <div v-else class="flow-root bg-white shadow-sm rounded-lg border border-gray-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary sm:pl-6">
                <button @click="toggleSort('name')" class="flex items-center group hover:text-primary">
                  Name
                  <span v-if="sortField === 'name'" class="ml-1 text-primary">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">
                <button @click="toggleSort('format')" class="flex items-center group hover:text-primary">
                  Format
                  <span v-if="sortField === 'format'" class="ml-1 text-primary">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">
                <button @click="toggleSort('status')" class="flex items-center group hover:text-primary">
                  Status
                  <span v-if="sortField === 'status'" class="ml-1 text-primary">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">
                Server
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">
                <button @click="toggleSort('updatedAt')" class="flex items-center group hover:text-primary">
                  Last Updated
                  <span v-if="sortField === 'updatedAt'" class="ml-1 text-primary">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
              </th>
              <th scope="col" class="relative py-3.5 pl-3 pr-6">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="config in filteredConfigs" :key="config._id" class="hover:bg-gray-50">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-secondary sm:pl-6">
                <RouterLink :to="`/configs/${config._id}`" class="hover:text-primary hover:underline">
                  {{ config.name }}
                </RouterLink>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', getFormatClass(config.format)]">
                  {{ config.format }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', getStatusClass(config.status)]">
                  {{ config.status }}
                </span>
                <span v-if="config.liveOnServers && config.liveOnServers.length > 0" class="ml-1 inline-flex items-center rounded-md bg-accent-2 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  Live
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div class="flex items-center">
                  <span class="truncate max-w-[200px]" :title="getServerName(config)">
                    {{ getServerName(config) }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ formatDate(config.updatedAt || config.createdAt) }}
              </td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="openApplyModal(config)"
                    class="text-green-600 hover:text-green-800 flex items-center"
                  >
                    <CloudArrowUpIcon class="h-4 w-4 mr-1" />
                    <span>Apply</span>
                  </button>
                  <RouterLink 
                    :to="`/configs/${config._id}`" 
                    class="text-secondary hover:text-secondary-dark flex items-center"
                  >
                    <EyeIcon class="h-4 w-4 mr-1" />
                    <span>View</span>
                  </RouterLink>
                  <RouterLink 
                    :to="`/configs/${config._id}/edit`" 
                    class="text-secondary hover:text-secondary-dark flex items-center"
                  >
                    <PencilIcon class="h-4 w-4 mr-1" />
                    <span>Edit</span>
                  </RouterLink>
                  <button 
                    @click="confirmDeleteConfig(config)" 
                    class="text-red-600 hover:text-red-800 flex items-center"
                  >
                    <TrashIcon class="h-4 w-4 mr-1" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Delete confirmation modal -->
    <ModalConfirm
      v-model="showDeleteConfirm"
      title="Delete Configuration"
      :message="configToDelete ? `Are you sure you want to delete the configuration '${configToDelete.name}'? This action cannot be undone.` : ''"
      :error="deleteError"
      confirm-text="Delete"
      processing-text="Deleting..."
      :is-processing="isDeleting"
      @confirm="handleDelete"
    />
    
    <!-- Apply configuration modal -->
    <ModalApplyConfig
      v-model="showApplyModal"
      :config="configToApply || {}"
      @success="handleApplySuccess"
    />
  </div>
</template>

<style scoped>
.animate-fade-in-out {
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
</style>