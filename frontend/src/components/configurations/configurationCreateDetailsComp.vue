<template>
  <div class="bg-white rounded-lg shadow border-none">
    <div class="bg-gray-50 border-b border-gray-100 p-4">
      <h5 class="m-0 font-semibold flex items-center justify-between">
        <div class="flex items-center">
          <DocumentTextIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
          Configuration Details
        </div>
      </h5>
    </div>
    
    <div class="p-6">
      <!-- Configuration Form -->
      <form @submit.prevent="">
        <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">
          {{ formError }}
        </div>

        <!-- Configuration Name -->
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium text-tertiary mb-1">Configuration Name</label>
          <input 
            id="name" 
            v-model="formData.name" 
            type="text" 
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="My Configuration"
            required
          />
        </div>

        <!-- Description -->
        <div class="mb-4">
          <label for="description" class="block text-sm font-medium text-tertiary mb-1">Description</label>
          <textarea 
            id="description" 
            v-model="formData.metadata.description"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Description of this configuration"
            rows="3"
          ></textarea>
        </div>
        
        <!-- Version -->
        <div class="mb-4">
          <label for="version" class="block text-sm font-medium text-tertiary mb-1">Version</label>
          <input 
            id="version" 
            v-model="formData.metadata.version" 
            type="text" 
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="1.0.0"
          />
        </div>

        <!-- Tags -->
        <div class="mb-4">
          <label for="tags" class="block text-sm font-medium text-tertiary mb-1">Tags (comma separated)</label>
          <input 
            id="tags" 
            v-model="tagsInput" 
            type="text" 
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="production, website, api"
          />
        </div>

        <!-- Server Selection -->
        <div class="mb-4">
          <label for="server" class="block text-sm font-medium text-tertiary mb-1">Target Server (Optional)</label>
          <select 
            id="server" 
            v-model="formData.serverId"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option value="">No specific server</option>
            <option v-for="server in servers" :key="server._id" :value="server._id">
              {{ server.name }}
            </option>
          </select>
          <p class="mt-1 text-xs text-gray-500">Select a server if this configuration is meant for a specific deployment target.</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import { useNotification } from "@kyvg/vue3-notification"

const emit = defineEmits(['details-updated'])

const serversStore = useCaddyServersStore()
const servers = computed(() => serversStore.servers)

// Form-related refs
const formError = ref(null)
const formData = ref({
  name: '',
  status: 'draft',
  format: 'json', // Always JSON for new configurations
  serverId: '',
  metadata: {
    description: '',
    version: '',
    tags: []
  }
})

// Tags input for simplified editing
const tagsInput = ref('')

// Fetch servers if not already loaded
if (servers.value.length === 0) {
  serversStore.fetchServers()
}

// Update the watch hook to emit changes to the parent component when form data changes
watch([formData, tagsInput], ([newFormData, newTagsInput]) => {
  // Process tags from the input field
  const tags = newTagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '')
  
  // Prepare the data to send
  const detailsToUpdate = { 
    ...newFormData,
    metadata: {
      ...newFormData.metadata,
      tags
    }
  }
  
  // Emit to parent component
  emit('details-updated', detailsToUpdate)
}, { deep: true })
</script>