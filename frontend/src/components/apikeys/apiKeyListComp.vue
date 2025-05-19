<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span>Loading API Keys...</span>
    </div>
    
    <!-- Error state -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <p class="text-red-700">{{ error }}</p>
    </div>
    
    <!-- API Keys List -->
    <div v-if="!loading" class="flow-root bg-white shadow-sm rounded-lg border border-gray-200">
      <div class="overflow-x-auto">
        <table v-if="apiKeys && apiKeys.length" class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary sm:pl-6">Name</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Created</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Last Used</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Expires</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Permissions</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Status</th>
              <th scope="col" class="relative py-3.5 pl-3 pr-6">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="key in apiKeys" :key="key._id" class="hover:bg-gray-50">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-secondary sm:pl-6">{{ key.name }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDate(key.createdAt) }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ key.lastUsed ? formatDate(key.lastUsed) : 'Never' }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDate(key.expiresAt) }}</td>
              <td class="px-3 py-4 text-sm">
                <div class="flex flex-wrap gap-1">
                  <span v-if="key.permissions.read" class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Read</span>
                  <span v-if="key.permissions.write" class="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">Write</span>
                  <span v-if="key.permissions.delete" class="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Delete</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', key.isActive ? 'bg-accent-2 text-green-700 ring-green-600/20' : 'bg-gray-50 text-tertiary ring-gray-600/10']">
                  {{ key.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-4">
                  <button @click="$emit('edit', key)" class="text-secondary hover:text-secondary-dark flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 mr-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-9.5A2.25 2.25 0 014 18.75V8.25A2.25 2.25 0 016.25 6H13" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button @click="$emit('delete', key._id)" class="text-red-600 hover:text-red-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 mr-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="text-center p-8 text-gray-500">
          You haven't created any API keys yet.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  apiKeys: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
});

defineEmits(['edit', 'delete']);

// Helper method to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
</script>