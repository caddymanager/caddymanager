<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { 
  FunnelIcon, 
  XCircleIcon, 
  ArrowPathIcon, 
  ChevronUpIcon, 
  ChevronDownIcon 
} from '@heroicons/vue/24/outline';

const props = defineProps({
  filterOptions: {
    type: Object,
    default: () => ({
      actions: [],
      resourceTypes: [],
      users: []
    })
  },
  filters: {
    type: Object,
    default: () => ({
      action: null,
      resourceType: null,
      resourceId: null,
      userId: null,
      username: null,
      startDate: null,
      endDate: null
    })
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:filters', 'apply-filters', 'clear-filters', 'refresh-options']);

// Internal filter state
const localFilters = ref({
  action: props.filters.action || null,
  resourceType: props.filters.resourceType || null,
  resourceId: props.filters.resourceId || null,
  userId: props.filters.userId || null,
  username: props.filters.username || null,
  startDate: props.filters.startDate || null,
  endDate: props.filters.endDate || null
});

// UI state
const showFilters = ref(true);
const showDateFilters = ref(false);
const isApplying = ref(false);

// Watch for external filter changes
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters };
  },
  { deep: true }
);

// Format date strings for input elements
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  // Check if it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return dateString.split('T')[0];
  }
  
  // If it's a date object or timestamp
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toISOString().split('T')[0];
};

// Computed properties
const formattedStartDate = computed({
  get: () => formatDateForInput(localFilters.value.startDate),
  set: (val) => { localFilters.value.startDate = val || null; }
});

const formattedEndDate = computed({
  get: () => formatDateForInput(localFilters.value.endDate),
  set: (val) => { localFilters.value.endDate = val || null; }
});

const hasActiveFilters = computed(() => {
  return Object.values(localFilters.value).some(val => val !== null && val !== '');
});

// Methods
const toggleFilters = () => {
  showFilters.value = !showFilters.value;
};

const toggleDateFilters = () => {
  showDateFilters.value = !showDateFilters.value;
};

const applyFilters = async () => {
  isApplying.value = true;
  emit('update:filters', { ...localFilters.value });
  
  try {
    await emit('apply-filters');
  } finally {
    await nextTick();
    isApplying.value = false;
  }
};

const clearFilters = async () => {
  localFilters.value = {
    action: null,
    resourceType: null,
    resourceId: null,
    userId: null,
    username: null,
    startDate: null,
    endDate: null
  };
  
  await nextTick();
  applyFilters();
  emit('clear-filters');
};

const refreshOptions = () => {
  emit('refresh-options');
};
</script>

<template>
  <div class="bg-white shadow rounded-lg border border-gray-200 mb-4">
    <div class="flex justify-between items-center p-4 border-b border-gray-200 cursor-pointer" @click="toggleFilters">
      <div class="flex items-center">
        <FunnelIcon class="h-5 w-5 text-gray-500 mr-2" />
        <h2 class="text-base font-medium text-gray-900">Filters</h2>
        <span 
          v-if="hasActiveFilters" 
          class="ml-2 inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-dark-600"
        >
          Active
        </span>
      </div>
      <div>
        <button 
          @click.stop="refreshOptions"
          class="text-gray-500 hover:text-primary mr-2"
          title="Refresh filter options"
          :disabled="isLoading"
        >
          <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        </button>
        <button @click.stop="toggleFilters" class="text-gray-500 hover:text-primary">
          <ChevronUpIcon v-if="showFilters" class="h-5 w-5" />
          <ChevronDownIcon v-else class="h-5 w-5" />
        </button>
      </div>
    </div>
    
    <div v-show="showFilters" class="p-4 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Action filter -->
        <div>
          <label for="action" class="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select
            id="action"
            v-model="localFilters.action"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option :value="null">All actions</option>
            <option v-for="action in filterOptions.actions" :key="action" :value="action">
              {{ action.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }}
            </option>
          </select>
        </div>
        
        <!-- Resource type filter -->
        <div>
          <label for="resourceType" class="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
          <select
            id="resourceType"
            v-model="localFilters.resourceType"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option :value="null">All resource types</option>
            <option v-for="type in filterOptions.resourceTypes" :key="type" :value="type">
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </option>
          </select>
        </div>
        
        <!-- Resource ID filter -->
        <div>
          <label for="resourceId" class="block text-sm font-medium text-gray-700 mb-1">Resource ID</label>
          <input
            id="resourceId"
            v-model="localFilters.resourceId"
            type="text"
            placeholder="Enter resource ID"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        
        <!-- User filter -->
        <div>
          <label for="userId" class="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            id="userId"
            v-model="localFilters.userId"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option :value="null">All users</option>
            <option v-for="user in filterOptions.users" :key="user.userId" :value="user.userId">
              {{ user.username }} ({{ user.count }} entries)
            </option>
          </select>
        </div>
        
        <!-- Username filter (alternative to userId) -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            id="username"
            v-model="localFilters.username"
            type="text"
            placeholder="Enter username"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        
        <!-- Date filters toggle -->
        <div>
          <button 
            @click="toggleDateFilters"
            class="flex items-center text-secondary hover:text-primary focus:outline-none text-sm font-medium"
          >
            <span>{{ showDateFilters ? 'Hide' : 'Show' }} Date Filters</span>
            <ChevronUpIcon v-if="showDateFilters" class="h-4 w-4 ml-1" />
            <ChevronDownIcon v-else class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
      
      <!-- Date range filters -->
      <div v-show="showDateFilters" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-2 border-t border-gray-100">
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            id="startDate"
            v-model="formattedStartDate"
            type="date"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            id="endDate"
            v-model="formattedEndDate"
            type="date"
            class="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
      </div>
      
      <!-- Action buttons -->
      <div class="flex justify-end space-x-4 mt-4 pt-4 border-t border-gray-100">
        <button
          @click="clearFilters"
          class="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          :disabled="!hasActiveFilters || isApplying"
        >
          <XCircleIcon class="h-4 w-4 mr-1" />
          Clear Filters
        </button>
        <button
          @click="applyFilters"
          class="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          :disabled="isApplying"
        >
          <FunnelIcon class="h-4 w-4 mr-1" />
          {{ isApplying ? 'Applying...' : 'Apply Filters' }}
        </button>
      </div>
    </div>
  </div>
</template>