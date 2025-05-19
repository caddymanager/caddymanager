<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ServerIcon, PlusIcon, ArrowPathIcon, EyeIcon, PencilIcon, TrashIcon, CogIcon } from '@heroicons/vue/24/outline';
import { useCaddyServersStore } from '@/stores/caddyServersStore';
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore';
import ModalConfirm from '@/components/modals/modalConfirmComp.vue';
import NoServersFoundComp from './noServersFoundComp.vue';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';

const props = defineProps({
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
});

const emit = defineEmits(['toggle-status', 'server-deleted', 'add-server']);

// Store initialization
const serversStore = useCaddyServersStore();
const configsStore = useCaddyConfigsStore();

// Delete confirmation modal state
const serverToDelete = ref(null);
const showDeleteConfirm = ref(false);
const deleteError = ref(null);
const isDeleting = ref(false);

// Success message for deletion
const showSuccessMessage = ref(false);
const successMessage = ref('');

const handleAddServer = () => {
  emit('add-server');
};

const confirmDeleteServer = (server) => {
  serverToDelete.value = server;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  if (isDeleting.value || !serverToDelete.value) return;
  
  isDeleting.value = true;
  deleteError.value = null;
  
  try {
    await serversStore.deleteServer(serverToDelete.value._id);
    
    // Show success message
    successMessage.value = `Server "${serverToDelete.value.name}" was deleted successfully`;
    showSuccessMessage.value = true;
    showDeleteConfirm.value = false;
    
    // Emit event to parent
    emit('server-deleted', serverToDelete.value._id);
    
    // Hide success message after a delay
    setTimeout(() => {
      showSuccessMessage.value = false;
    }, 3000);
  } catch (error) {
    deleteError.value = error.message || 'An error occurred while deleting';
  } finally {
    isDeleting.value = false;
  }
};

const toggleServerStatus = (server) => {
  emit('toggle-status', server);
};

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Helper function to check if a server has tags
const hasTags = (server) => {
  return server.tags && Array.isArray(server.tags) && server.tags.length > 0;
};

// Get active configuration for a server
const getActiveConfig = (serverId) => {
  return configsStore.getConfigByServer(serverId);
};

// Computed property to format server status for display
const getStatusClass = (status) => {
  switch(status) {
    case 'online':
      return 'bg-accent-2 text-green-700 ring-green-600/20';
    case 'offline':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'restarting':
      return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10';
  }
};
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
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading servers..."
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
    <NoServersFoundComp v-else-if="!servers || servers.length === 0" @add-server="handleAddServer" />
    
    <!-- Servers table -->
    <div v-else class="flow-root bg-white shadow-sm rounded-lg border border-gray-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary sm:pl-6">Name</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Status</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">API URL</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Type</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Tags</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Last Contact</th>
              <th scope="col" class="relative py-3.5 pl-3 pr-6">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="server in servers" :key="server._id" class="hover:bg-gray-50">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
                <RouterLink :to="`/servers/${server._id}`" class="text-secondary hover:text-primary hover:underline">
                  {{ server.name }}
                </RouterLink>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', getStatusClass(server.status)]">
                  {{ server.status || 'Unknown' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ server.apiUrl }}:{{ server.apiPort }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span v-if="server.existingInstance" class="inline-flex items-center rounded-md bg-tertiary/20 px-1.5 py-0.5 text-xs font-medium text-tertiary ring-1 ring-inset ring-tertiary/30">
                  Existing
                </span>
                <span v-else class="inline-flex items-center rounded-md bg-secondary/20 px-1.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/30">
                  Managed
                </span>
              </td>
              <td class="px-3 py-4 text-sm">
                <div class="flex flex-wrap gap-1 max-w-[200px]">
                  <span
                    v-for="(tag, idx) in server.tags || []"
                    :key="idx"
                    class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="!hasTags(server)" class="text-gray-400 italic text-xs">No tags</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ server.lastPinged ? formatDate(server.lastPinged) : 'Never' }}
              </td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-4">
                  <RouterLink 
                    :to="`/servers/${server._id}`" 
                    class="text-secondary hover:text-secondary-dark flex items-center"
                  >
                    <EyeIcon class="h-4 w-4 mr-1" />
                    <span>View</span>
                  </RouterLink>
                  <RouterLink 
                    :to="getActiveConfig(server._id) ? { name: 'configDetails', params: { id: getActiveConfig(server._id)._id } } : { name: 'configs', query: { server: server._id } }" 
                    class="text-secondary hover:text-secondary-dark flex items-center"
                  >
                    <CogIcon class="h-4 w-4 mr-1" />
                    <span>Config</span>
                  </RouterLink>
                  <button 
                    @click="confirmDeleteServer(server)" 
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
      title="Delete Server"
      :message="serverToDelete ? `Are you sure you want to delete the server '${serverToDelete.name}'? This action cannot be undone.` : ''"
      :error="deleteError"
      confirm-text="Delete"
      processing-text="Deleting..."
      :is-processing="isDeleting"
      @confirm="handleDelete"
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