<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { 
  FunnelIcon, 
  XCircleIcon, 
  ArrowPathIcon, 
  ChevronUpIcon, 
  ChevronDownIcon 
} from '@heroicons/vue/24/outline';
import InputFieldComp from '../util/inputFieldComp.vue';
import SelectFieldComp from '../util/selectFieldComp.vue';

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

// Computed option lists for SelectFieldComp
const actionOptions = computed(() => (props.filterOptions.actions || []).map(a => {
  const label = a.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return { value: a, label };
}));

const resourceTypeOptions = computed(() => (props.filterOptions.resourceTypes || []).map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })));

const userOptions = computed(() => (props.filterOptions.users || []).map(u => ({ value: u.userId, label: `${u.username} (${u.count} entries)` })));

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
          <SelectFieldComp
            id="action"
            v-model="localFilters.action"
            :options="actionOptions"
            label="Action"
            placeholder="All actions"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        
        <!-- Resource type filter -->
        <div>
          <SelectFieldComp
            id="resourceType"
            v-model="localFilters.resourceType"
            :options="resourceTypeOptions"
            label="Resource Type"
            placeholder="All resource types"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        
        <!-- Resource ID filter -->
        <div>
          <InputFieldComp
            id="resourceId"
            v-model="localFilters.resourceId"
            label="Resource ID"
            placeholder="Enter resource ID"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        
        <!-- User filter -->
        <div>
          <SelectFieldComp
            id="userId"
            v-model="localFilters.userId"
            :options="userOptions"
            label="User"
            placeholder="All users"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        
        <!-- Username filter (alternative to userId) -->
        <div>
          <InputFieldComp
            id="username"
            v-model="localFilters.username"
            label="Username"
            placeholder="Enter username"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
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
          <InputFieldComp
            id="startDate"
            v-model="formattedStartDate"
            label="Start Date"
            type="date"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>
        <div>
          <InputFieldComp
            id="endDate"
            v-model="formattedEndDate"
            label="End Date"
            type="date"
            extraClass="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
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