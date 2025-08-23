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
          <InputFieldComp
            id="name"
            v-model="formData.name"
            label="Configuration Name"
            placeholder="My Configuration"
            extraClass="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            required
          />
        </div>

        <!-- Description -->
        <div class="mb-4">
          <label for="description" class="block text-sm font-medium text-tertiary mb-1">Description</label>
          <textarea 
            id="description" 
            v-model="formData.metadata.description"
            class="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Description of this configuration"
            rows="3"
          ></textarea>
        </div>
        
        <!-- Version -->
        <div class="mb-4">
          <InputFieldComp
            id="version"
            v-model="formData.metadata.version"
            label="Version"
            placeholder="1.0.0"
            extraClass="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        <!-- Tags -->
        <div class="mb-4">
          <InputFieldComp
            id="tags"
            v-model="tagsInput"
            label="Tags (comma separated)"
            placeholder="production, website, api"
            extraClass="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        <!-- Server Selection -->
        <div class="mb-4">
          <SelectFieldComp
            id="server"
            v-model="formData.serverId"
            :options="[{ value: '', label: 'No specific server' }, ...(servers.map(s => ({ value: s._id, label: s.name })))]"
            label="Target Server (Optional)"
            extraClass="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
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
import InputFieldComp from '@/components/util/inputFieldComp.vue'
import SelectFieldComp from '@/components/util/selectFieldComp.vue'

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