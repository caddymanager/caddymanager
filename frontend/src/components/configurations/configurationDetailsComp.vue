<template>
  <div class="bg-white rounded-lg shadow border-none">
    <div v-if="isLoading" class="flex justify-center items-center h-[300px]">
      <LoadingSpinnerComp 
        caption="Loading configuration..."
        color="gradient"
        size="medium"
        text-color="text-gray-500"
      />
    </div>
    
    <div v-else-if="error" class="alert bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
      {{ error }}
    </div>
    
    <div v-else-if="config" class="flex flex-col">
      <div class="bg-gray-50 border-b border-gray-100 p-4">
        <h5 class="m-0 font-semibold flex items-center justify-between">
          <div class="flex items-center">
            <DocumentTextIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
            {{ isEditMode ? 'Edit Configuration' : 'Configuration Details' }}
          </div>
          <div v-if="config && !isEditMode" class="flex items-center">
            <span :class="[
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
              config.status === 'live' ? 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20' : 
              config.status === 'draft' ? 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/10' : 
              'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-500/10'
            ]">
              {{ config.status || 'Draft' }}
            </span>
          </div>
        </h5>
      </div>
      
      <div class="p-6">
        <!-- Edit Form -->
        <form v-if="isEditMode" @submit.prevent="">
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

          <!-- Status -->
          <div class="mb-4">
            <label for="status" class="block text-sm font-medium text-tertiary mb-1">Status</label>
            <select 
              id="status" 
              v-model="formData.status"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="draft">Draft</option>
              <option value="live">Live</option>
            </select>
          </div>

          <!-- No buttons here anymore, as saving is handled by the parent -->
        </form>

        <!-- View Mode Content -->
        <div v-else>
          <div v-if="config.metadata?.description" class="mb-4">
            <p class="text-gray-500">{{ config.metadata.description }}</p>
          </div>
          
          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Configuration Information</h5>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Name</div>
              <div class="flex-1">{{ config.name }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Format</div>
              <div class="flex-1 capitalize">
                <span :class="[formatClass, 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset']">
                  {{ config.format }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Version</div>
              <div class="flex-1">{{ config.metadata?.version || 'N/A' }}</div>
            </div>
            <div v-if="config.metadata?.tags && config.metadata.tags.length > 0" class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Tags</div>
              <div class="flex-1">
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="(tag, index) in config.metadata.tags" 
                    :key="index"
                    class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 mr-1 mb-1"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Status Information</h5>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Current Status</div>
              <div class="flex-1">
                <span :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                  config.status === 'live' ? 'bg-green-100 text-green-800' : 
                  config.status === 'draft' ? 'bg-blue-100 text-blue-800' : 
                  'bg-gray-100 text-gray-800'
                ]">
                  {{ config.status || 'Draft' }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Live Status</div>
              <div class="flex-1">
                <span :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                  config.isLiveOnServer ? 'bg-accent-2 text-green-800 ring-1 ring-inset ring-green-600/20' : 
                  'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-600/20'
                ]">
                  {{ config.isLiveOnServer ? 'Active on server(s)' : 'Not active' }}
                </span>
              </div>
            </div>
            <div v-if="serversCount > 0" class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Server Count</div>
              <div class="flex-1">{{ serversCount }} server(s)</div>
            </div>
          </div>
          
          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Configuration History</h5>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Created On</div>
              <div class="flex-1">{{ formatDate(config.createdAt) }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Updated On</div>
              <div class="flex-1">{{ formatDate(config.updatedAt) }}</div>
            </div>
            <div v-if="lastApplied" class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Last Applied</div>
              <div class="flex-1">{{ lastApplied }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
      No configuration information available
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import { DocumentTextIcon, ArrowLeftIcon, PencilIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { RouterLink, useRouter } from 'vue-router'
import { useNotification } from "@kyvg/vue3-notification"
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

const props = defineProps({
  configId: {
    type: String,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['details-updated'])

const router = useRouter()
const configsStore = useCaddyConfigsStore()
const isLoading = computed(() => configsStore.isLoading)
const error = computed(() => configsStore.error)
const config = computed(() => configsStore.getConfigById(props.configId))

// Form-related refs
const formError = ref(null)
const isSaving = ref(false)
const formData = ref({
  name: '',
  status: 'draft',
  format: 'json',
  metadata: {
    description: '',
    version: '',
    tags: []
  }
})

// Tags input for simplified editing
const tagsInput = ref('')

// Initialize form data when config data is loaded
watch(config, (newConfig) => {
  if (newConfig) {
    formData.value = {
      name: newConfig.name || '',
      status: newConfig.status || 'draft',
      format: newConfig.format || 'json',
      metadata: {
        description: newConfig.metadata?.description || '',
        version: newConfig.metadata?.version || '',
        tags: newConfig.metadata?.tags || []
      }
    }
    
    // Join tags as comma-separated string for the input field
    tagsInput.value = newConfig.metadata?.tags ? newConfig.metadata.tags.join(', ') : ''
  }
}, { immediate: true })

// Update the watch hook to emit changes to the parent component when form data changes
watch([formData, tagsInput], ([newFormData, newTagsInput]) => {
  if (props.isEditMode && newFormData) {
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
  }
}, { deep: true })

// Format badges for format
const formatClass = computed(() => {
  const format = config.value?.format
  switch(format) {
    case 'json':
      return 'bg-purple-50 text-purple-700 ring-purple-600/20'
    default:
      return 'bg-gray-50 text-tertiary ring-gray-600/10'
  }
})

// Count servers associated with this config
const serversCount = computed(() => {
  if (!config.value) return 0
  
  // Count servers associated with this config
  if (Array.isArray(config.value.servers)) {
    return config.value.servers.length
  }
  
  // If that's empty, check if there's a single server
  if (config.value.server) {
    return 1
  }
  
  return 0
})

// Get last applied date
const lastApplied = computed(() => {
  if (!config.value) return null
  
  let mostRecent = null
  
  // Check in history for deployed actions
  if (config.value.history && Array.isArray(config.value.history)) {
    const deployedEvents = config.value.history.filter(h => h.action === 'deployed')
    deployedEvents.forEach(event => {
      if (event.timestamp) {
        const eventDate = new Date(event.timestamp)
        if (!mostRecent || eventDate > mostRecent) {
          mostRecent = eventDate
        }
      }
    })
  }
  
  return mostRecent ? formatDate(mostRecent) : null
})

function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString()
}
</script>