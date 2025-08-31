<script setup>
import { ref, computed } from 'vue';
import { UserIcon, DocumentTextIcon, ClockIcon, TagIcon, ShieldCheckIcon, ComputerDesktopIcon } from '@heroicons/vue/24/outline';
import ModalFormComp from '@/components/modals/modalFormComp.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // Make auditLog optional and provide a safe default so the modal can render
  // defensively when invoked from different call sites (dashboard, table, etc.)
  auditLog: {
    type: Object,
    required: false,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'view-user-logs', 'view-resource-logs']);

// Create a computed prop to properly handle v-model
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  }).format(date);
};

// Format the action name for display
const formattedAction = computed(() => {
  if (!props.auditLog?.action) return 'Unknown Action';
  
  return props.auditLog.action
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});

// Get status class based on status code
const getStatusClass = (statusCode) => {
  if (!statusCode) return 'bg-gray-50 text-gray-700';
  
  if (statusCode < 300) return 'bg-green-50 text-green-700';
  if (statusCode < 400) return 'bg-blue-50 text-blue-700';
  if (statusCode < 500) return 'bg-yellow-50 text-yellow-700';
  return 'bg-red-50 text-red-700';
};

// Handle user click
const handleUserClick = () => {
  if (props.auditLog?.user?.userId) {
    emit('view-user-logs', props.auditLog.user.userId, props.auditLog.user.username);
    emit('update:modelValue', false);
  }
};

// Handle resource click
const handleResourceClick = () => {
  if (props.auditLog?.resourceType && props.auditLog?.resourceId) {
    emit('view-resource-logs', props.auditLog.resourceType, props.auditLog.resourceId);
    emit('update:modelValue', false);
  }
};

// Determines if details should be shown as JSON or pre-formatted
const showDetailsAsJson = computed(() => {
  const details = props.auditLog?.details;
  return details && typeof details === 'object' && Object.keys(details).length > 0;
});

// Format JSON for display
const formattedDetails = computed(() => {
  if (!showDetailsAsJson.value) return '';
  try {
    return JSON.stringify(props.auditLog?.details, null, 2);
  } catch (e) {
    return JSON.stringify({ error: 'Could not parse details', message: e.message });
  }
});

// Check if JSON has diffs (before/after)
const hasBeforeAfter = computed(() => {
  const details = props.auditLog?.details;
  return details && details.before !== undefined && details.after !== undefined;
});

// Extract changes between before and after
const extractChanges = computed(() => {
  if (!hasBeforeAfter.value) return [];
  
  const before = props.auditLog.details.before;
  const after = props.auditLog.details.after;
  const changes = [];
  
  // Collect all unique keys
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);
  
  // Compare values
  allKeys.forEach(key => {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];
    
    // Skip if values are the same
    if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return;
    
    changes.push({
      key,
      before: beforeVal,
      after: afterVal,
      type: beforeVal === undefined ? 'added' : (afterVal === undefined ? 'removed' : 'changed')
    });
  });
  
  return changes;
});

// Get change type class
const getChangeTypeClass = (type) => {
  switch (type) {
    case 'added': return 'text-green-600';
    case 'removed': return 'text-red-600';
    case 'changed': return 'text-blue-600';
    default: return 'text-gray-600';
  }
};

// Format value for display
const formatValue = (val) => {
  if (val === undefined) return '(undefined)';
  if (val === null) return '(null)';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return '(complex object)';
    }
  }
  return String(val);
};

// Debugging: watch incoming auditLog payloads so callers (dashboard) can be
// quickly verified during development. This is non-destructive and only logs
// when the component receives new data.
import { watch } from 'vue';
watch(() => props.auditLog, (newVal) => {
  try {
    console.debug('ModalAuditLogDetailsComp received auditLog:', newVal && Object.keys(newVal).length ? newVal : '(empty)');
  } catch (e) {
    console.debug('ModalAuditLogDetailsComp received auditLog (unserializable)');
  }
}, { immediate: true });
</script>

<template>
  <ModalFormComp
    v-model="showModal"
    title="Audit Log Details"
    size="lg"
    :show-default-footer="false"
  >
    <div class="text-gray-700 space-y-6">
      <!-- Header info -->
      <div class="bg-gray-50 p-4 rounded-md">
        <h3 class="font-bold mb-2 text-secondary text-lg">{{ formattedAction }}</h3>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span :class="['px-2 py-1 rounded-md font-medium', getStatusClass(auditLog.statusCode)]">
            Status: {{ auditLog.statusCode || 'N/A' }}
          </span>
          <span class="flex items-center">
            <ClockIcon class="h-4 w-4 mr-1 text-gray-500" />
            {{ formatDate(auditLog.timestamp) }}
          </span>
        </div>
      </div>
      
      <!-- User section -->
      <div class="border-b border-gray-200 pb-4">
        <h4 class="font-semibold mb-2 flex items-center text-gray-700">
          <UserIcon class="h-5 w-5 mr-2 text-secondary" />
          User
        </h4>
        <div class="pl-7">
          <p v-if="auditLog.user?.username" class="mb-1">
            <button 
              v-if="auditLog.user?.userId"
              @click="handleUserClick"
              class="text-secondary hover:text-primary hover:underline"
            >
              {{ auditLog.user.username }}
            </button>
            <span v-else>{{ auditLog.user.username }}</span>
          </p>
          <p v-if="auditLog.user?.userId" class="text-sm text-gray-500">ID: {{ auditLog.user.userId }}</p>
          <p v-if="!auditLog.user?.username && !auditLog.user?.userId" class="text-gray-500">System action (no user)</p>
        </div>
      </div>
      
      <!-- Resource section -->
      <div class="border-b border-gray-200 pb-4">
        <h4 class="font-semibold mb-2 flex items-center text-gray-700">
          <DocumentTextIcon class="h-5 w-5 mr-2 text-secondary" />
          Resource
        </h4>
        <div class="pl-7">
          <p v-if="auditLog.resourceType" class="mb-1">
            <span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {{ auditLog.resourceType }}
            </span>
          </p>
          <p v-if="auditLog.resourceId" class="mb-1">
            <button 
              @click="handleResourceClick"
              class="text-secondary hover:text-primary hover:underline"
            >
              ID: {{ auditLog.resourceId }}
            </button>
          </p>
          <p v-if="!auditLog.resourceType && !auditLog.resourceId" class="text-gray-500">No resource information</p>
        </div>
      </div>
      
      <!-- Client info section -->
      <div class="border-b border-gray-200 pb-4">
        <h4 class="font-semibold mb-2 flex items-center text-gray-700">
          <ComputerDesktopIcon class="h-5 w-5 mr-2 text-secondary" />
          Client Information
        </h4>
        <div class="pl-7 grid grid-cols-1 md:grid-cols-2 gap-2">
          <p v-if="auditLog.ipAddress" class="text-sm">
            <strong>IP Address:</strong> {{ auditLog.ipAddress }}
          </p>
          <p v-if="auditLog.userAgent" class="text-sm">
            <strong>User Agent:</strong> 
            <span class="block text-xs mt-1 break-words">{{ auditLog.userAgent }}</span>
          </p>
        </div>
      </div>
      
      <!-- Changes/Details section -->
      <div>
        <h4 class="font-semibold mb-2 flex items-center text-gray-700">
          <TagIcon class="h-5 w-5 mr-2 text-secondary" />
          Details
        </h4>
        
        <!-- Show changes if before/after exist -->
        <div v-if="hasBeforeAfter" class="pl-7">
          <h5 class="text-sm font-medium mb-2">Changes</h5>
          <div class="bg-gray-50 rounded-md p-3 overflow-auto max-h-60">
            <table v-if="extractChanges.length > 0" class="min-w-full text-sm">
              <thead>
                <tr>
                  <th class="text-left py-1 px-2 text-xs uppercase tracking-wider text-gray-500">Field</th>
                  <th class="text-left py-1 px-2 text-xs uppercase tracking-wider text-gray-500">Type</th>
                  <th class="text-left py-1 px-2 text-xs uppercase tracking-wider text-gray-500">Before</th>
                  <th class="text-left py-1 px-2 text-xs uppercase tracking-wider text-gray-500">After</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="change in extractChanges" :key="change.key" class="border-t border-gray-200">
                  <td class="py-2 px-2 align-top font-medium">{{ change.key }}</td>
                  <td class="py-2 px-2 align-top">
                    <span :class="['inline-block rounded-full px-2 py-1 text-xs font-medium', getChangeTypeClass(change.type)]">
                      {{ change.type }}
                    </span>
                  </td>
                  <td class="py-2 px-2 align-top">
                    <pre v-if="change.before !== undefined" class="text-xs whitespace-pre-wrap break-words">{{ formatValue(change.before) }}</pre>
                    <span v-else class="text-gray-400 italic">—</span>
                  </td>
                  <td class="py-2 px-2 align-top">
                    <pre v-if="change.after !== undefined" class="text-xs whitespace-pre-wrap break-words">{{ formatValue(change.after) }}</pre>
                    <span v-else class="text-gray-400 italic">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-gray-500 text-sm italic">No changes detected in the details</p>
          </div>
        </div>
        
        <!-- Show raw details -->
        <div v-else-if="showDetailsAsJson" class="pl-7">
          <h5 class="text-sm font-medium mb-2">Raw Details</h5>
          <div class="bg-gray-50 rounded-md overflow-auto max-h-60">
            <pre class="p-3 text-xs whitespace-pre-wrap">{{ formattedDetails }}</pre>
          </div>
        </div>
        
        <div v-else class="pl-7 text-gray-500 italic">No additional details available</div>
      </div>
    </div>
    
    <template #footer>
      <button
        @click="showModal = false"
        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Close
      </button>
    </template>
  </ModalFormComp>
</template>