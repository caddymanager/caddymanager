<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { EyeIcon, DocumentTextIcon, ServerIcon, UserIcon, KeyIcon, CogIcon } from '@heroicons/vue/24/outline';
import { useAuditLogStore } from '@/stores/auditLogStore';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';

const props = defineProps({
  logs: {
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

const emit = defineEmits(['view-details']);

// Store initialization
const auditLogStore = useAuditLogStore();

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

// Get icon based on resource type
const getResourceIcon = (resourceType) => {
  switch(resourceType?.toLowerCase()) {
    case 'server':
      return ServerIcon;
    case 'config':
    case 'configuration':
      return CogIcon;
    case 'user':
      return UserIcon;
    case 'apikey':
      return KeyIcon;
    default:
      return DocumentTextIcon;
  }
};

// Get action style based on action type
const getActionClass = (action) => {
  switch(action?.toLowerCase()) {
    case 'create':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    case 'update':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    case 'delete':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'login':
    case 'logout':
      return 'bg-purple-50 text-purple-700 ring-purple-600/20';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-600/20';
  }
};

const viewDetails = (log) => {
  emit('view-details', log);
};

// Function to truncate long text
const truncate = (text, length = 30) => {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
};
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading audit logs..."
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
    <div v-else-if="!logs || logs.length === 0" class="text-center py-10 bg-gray-50 rounded-lg">
      <DocumentTextIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-semibold text-gray-900">No audit logs found</h3>
      <p class="mt-1 text-sm text-gray-500">No audit log entries match your current filters.</p>
    </div>
    
    <!-- Audit logs table -->
    <div v-else class="flow-root bg-white shadow-sm rounded-lg border border-gray-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary sm:pl-6">Timestamp</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">User</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Action</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Resource Type</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Resource</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">IP Address</th>
              <th scope="col" class="relative py-3.5 pl-3 pr-6">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="log in logs" :key="log._id" class="hover:bg-gray-50">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {{ formatDate(log.timestamp) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ log.user?.username || 'System' }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', getActionClass(log.action)]">
                  {{ log.action || 'Unknown' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div class="flex items-center">
                  <component :is="getResourceIcon(log.resourceType)" class="h-4 w-4 mr-2 text-gray-400" />
                  {{ log.resourceType || 'Unknown' }}
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ truncate(log.resourceName || log.resourceId) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ log.ipAddress || 'N/A' }}
              </td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                <button
                  @click="viewDetails(log)"
                  class="text-secondary hover:text-secondary-dark flex items-center justify-end"
                >
                  <EyeIcon class="h-4 w-4 mr-1" />
                  <span>Details</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>