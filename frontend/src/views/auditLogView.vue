<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { DocumentTextIcon } from '@heroicons/vue/24/outline';
import { useAuditLogStore } from '@/stores/auditLogStore';
import AuditLogFiltersComp from '@/components/auditlog/auditLogFiltersComp.vue';
import AuditLogTableComp from '@/components/auditlog/auditLogTableComp.vue';
import ModalAuditLogDetailsComp from '@/components/auditlog/modalAuditLogDetailsComp.vue';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';
import PageTitleComp from '@/components/util/pageTitleComp.vue';

// Store initialization
const auditLogStore = useAuditLogStore();

// State for logs and pagination
const logs = ref([]);
const isLoading = ref(false);
const error = ref(null);
const totalLogs = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Detail modal state
const selectedLog = ref(null);
const showLogDetails = ref(false);

// Filters state
const filterOptions = ref({
  actions: [],
  resourceTypes: [],
  users: []
});

const filters = ref({
  action: null,
  resourceType: null,
  resourceId: null,
  userId: null,
  username: null,
  startDate: null,
  endDate: null
});

// Page title configuration
const breadcrumbs = [
  { name: 'Dashboard', path: '/' },
  { name: 'Audit Log', path: '/audit-log' }
];

const refreshButton = {
  text: 'Refresh',
  action: fetchAuditLogs,
  disabled: isLoading,
  icon: 'ArrowPathIcon'
};

// Load initial data
onMounted(async () => {
  await loadFilterOptions();
  await fetchAuditLogs();
});

// Watch for page changes
watch(currentPage, async () => {
  await fetchAuditLogs();
});

async function fetchAuditLogs() {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Prepare query params for API
    const query = {
      page: currentPage.value,
      limit: pageSize.value,
      ...filters.value
    };
    
    // Remove null values
    Object.keys(query).forEach(key => {
      if (query[key] === null || query[key] === '') {
        delete query[key];
      }
    });
    
    const response = await auditLogStore.fetchAuditLogs(query);
    logs.value = response.auditLogs || [];
    totalLogs.value = response.total || 0;
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    error.value = err.message || 'Failed to fetch audit logs';
    logs.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function loadFilterOptions() {
  try {
    const options = await auditLogStore.fetchFilterOptions();
    filterOptions.value = options;
  } catch (err) {
    console.error('Error loading filter options:', err);
  }
}

function handleViewDetails(log) {
  selectedLog.value = log;
  showLogDetails.value = true;
}

function handleApplyFilters() {
  currentPage.value = 1; // Reset to first page when filters change
  return fetchAuditLogs();
}

function handleClearFilters() {
  filters.value = {
    action: null,
    resourceType: null,
    resourceId: null,
    userId: null,
    username: null,
    startDate: null,
    endDate: null
  };
}

function handleViewUserLogs(userId, username) {
  filters.value.userId = userId;
  filters.value.username = username;
  currentPage.value = 1;
  fetchAuditLogs();
}

function handleViewResourceLogs(resourceType, resourceId) {
  filters.value.resourceType = resourceType;
  filters.value.resourceId = resourceId;
  currentPage.value = 1;
  fetchAuditLogs();
}

function handlePageChange(page) {
  currentPage.value = page;
}

// Calculate pagination data
const totalPages = computed(() => Math.ceil(totalLogs.value / pageSize.value));
const showPagination = computed(() => totalPages.value > 1);
</script>

<template>
  <div>
    <!-- Page header -->
    <PageTitleComp
      title="Audit Log"
      description="View a recent history of actions taken in the system"
      :breadcrumbs="breadcrumbs"
      :additionalButtons="[refreshButton]"
      :isLoading="isLoading"
    />
    
    <!-- Filters component -->
    <AuditLogFiltersComp
      v-model:filters="filters"
      :filter-options="filterOptions"
      :is-loading="isLoading"
      @apply-filters="handleApplyFilters"
      @clear-filters="handleClearFilters"
      @refresh-options="loadFilterOptions"
    />
    
    <!-- Table component -->
    <AuditLogTableComp
      :logs="logs"
      :is-loading="isLoading"
      :error="error"
      @view-details="handleViewDetails"
    />
    
    <!-- Pagination -->
    <div v-if="showPagination" class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
      <div class="flex flex-1 justify-between sm:hidden">
        <button
          @click="handlePageChange(currentPage - 1)"
          :disabled="currentPage === 1"
          :class="[
            'relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium',
            currentPage === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-secondary hover:bg-gray-50'
          ]"
        >
          Previous
        </button>
        <button
          @click="handlePageChange(currentPage + 1)"
          :disabled="currentPage === totalPages"
          :class="[
            'relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium',
            currentPage === totalPages 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-secondary hover:bg-gray-50'
          ]"
        >
          Next
        </button>
      </div>
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Showing
            <span class="font-medium">{{ ((currentPage - 1) * pageSize) + 1 }}</span>
            to
            <span class="font-medium">{{ Math.min(currentPage * pageSize, totalLogs) }}</span>
            of
            <span class="font-medium">{{ totalLogs }}</span>
            results
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              @click="handlePageChange(currentPage - 1)"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
              :class="{ 'cursor-not-allowed': currentPage === 1 }"
            >
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>
            
            <!-- Page numbers (limited display) -->
            <template v-for="page in totalPages" :key="page">
              <button
                v-if="
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                "
                @click="handlePageChange(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 text-sm font-medium ring-1 ring-inset ring-gray-300', 
                  page === currentPage
                    ? 'z-10 bg-primary text-tertiary focus-visible:outline-offset-0'
                    : 'text-gray-900 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
              <span
                v-else-if="
                  page === currentPage - 2 || 
                  page === currentPage + 2
                "
                class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700"
              >
                ...
              </span>
            </template>
            
            <button
              @click="handlePageChange(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
              :class="{ 'cursor-not-allowed': currentPage === totalPages }"
            >
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
    
    <!-- Details modal -->
    <ModalAuditLogDetailsComp
      v-if="selectedLog"
      v-model="showLogDetails"
      :audit-log="selectedLog"
      @view-user-logs="handleViewUserLogs"
      @view-resource-logs="handleViewResourceLogs"
    />
  </div>
</template>