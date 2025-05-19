<template>
  <div class="">
    <page-title-comp 
      :title="config ? `${isEditMode ? 'Edit' : 'Configuration'}: ${config.name}` : (isEditMode ? 'Edit Configuration' : 'Configuration Details')"
      :breadcrumbs="[
        { name: 'Dashboard', path: '/' },
        { name: 'Configurations', path: '/configs' },
        { name: config ? config.name : (isEditMode ? 'Edit Configuration' : 'Configuration Details'), path: '', active: true }
      ]"
      :secondary-button="{ 
        text: 'Back to Configurations', 
        action: () => router.push('/configs')
      }"
      :primary-button="!isEditMode && config ? {
        text: 'Edit Configuration',
        action: () => router.push(`/configs/${id}/edit`),
        icon: 'PencilIcon'
      } : null"
      :is-loading="isLoading"
    />
    
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{{ error }}</div>
    
    <div v-if="isLoading && !config" class="flex justify-center items-center py-5">
      <loading-spinner-comp 
        caption="Loading configuration..."
        color="gradient"
        size="medium"
      />
    </div>
    
    <div v-else-if="config" class="flex flex-col gap-6">
      <!-- Main content with two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:grid-flow-col">
        <!-- Left column: Config details (1/3 width) with max-height -->
        <div class="flex flex-col gap-6 lg:max-h-screen lg:overflow-y-auto lg:contents">
          <div class="lg:self-start w-full">
            <configuration-details-comp 
              :config-id="id" 
              :is-edit-mode="isEditMode"
              @details-updated="onDetailsUpdated" 
            />
            <!-- Servers using this configuration - only show in view mode -->
            <div v-if="!isEditMode && serversUsingConfig && serversUsingConfig.length > 0" class="lg:self-start w-full mt-4">
              <div class="bg-white rounded-lg shadow">
                <div class="bg-gray-50 border-b border-gray-100 p-4">
                  <h5 class="m-0 font-semibold flex items-center">
                    <ServerIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
                    Servers Using This Configuration
                  </h5>
                </div>
                <div class="p-4">
                  <ul class="divide-y divide-gray-200">
                    <li v-for="server in serversUsingConfig" :key="server._id" class="py-3 flex justify-between items-center">
                      <div class="flex items-center">
                        <span :class="[
                          'mr-2 inline-flex items-center rounded-full h-2 w-2',
                          server.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                        ]"></span>
                        <span class="text-sm text-gray-900">{{ server.name }}</span>
                      </div>
                      <RouterLink :to="`/servers/${server._id}`" class="text-sm text-primary hover:text-primary-dark">
                        View
                      </RouterLink>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Right column: Configuration content details (2/3 width) -->
        <div class="lg:col-span-2 flex flex-col">
          <configuration-data-comp 
            :config-id="id" 
            :is-edit-mode="isEditMode"
            @json-content-updated="onJsonContentUpdated"
            @json-validation="onJsonValidation"
          />
        </div>
      </div>
      
      <!-- Save Changes button for edit mode -->
      <div v-if="isEditMode" class="flex justify-end pt-2 ">
        <button 
          @click="cancelEdit"
          class="inline-flex items-center rounded-md bg-white mr-2 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button 
          @click="saveAllChanges"
          class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          :disabled="isSavingChanges || !!jsonValidationError"
        >
          <span v-if="isSavingChanges" class="mr-2">
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          <span v-else>
            Save All Changes
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import ConfigurationDetailsComp from '@/components/configurations/configurationDetailsComp.vue'
import ConfigurationDataComp from '@/components/configurations/configurationDataComp.vue'
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'
import { ArrowPathIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { RouterLink } from 'vue-router'
import { useNotification } from "@kyvg/vue3-notification"

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const configsStore = useCaddyConfigsStore()
const serversStore = useCaddyServersStore()
const { notify } = useNotification()

const error = ref(null)
const isLoading = computed(() => configsStore.isLoading || serversStore.isLoading)
const config = computed(() => configsStore.getConfigById(props.id))

// Get servers that are using this configuration
const serversUsingConfig = computed(() => {
  if (!config.value) return []
  
  // Check servers using this configuration via liveOnServers array
  const serverIds = []
  if (config.value.liveOnServers && Array.isArray(config.value.liveOnServers)) {
    config.value.liveOnServers.forEach(entry => {
      if (typeof entry.server === 'string') {
        serverIds.push(entry.server)
      } else if (entry.server && entry.server._id) {
        serverIds.push(entry.server._id)
      }
    })
  }
  
  // Also check for legacy relations
  if (config.value.server) {
    const serverId = typeof config.value.server === 'string' ? 
      config.value.server : 
      config.value.server._id
    
    if (serverId && !serverIds.includes(serverId)) {
      serverIds.push(serverId)
    }
  }
  
  // Include servers from servers array field
  if (Array.isArray(config.value.servers)) {
    config.value.servers.forEach(serverId => {
      const id = typeof serverId === 'string' ? serverId : (serverId && serverId._id)
      if (id && !serverIds.includes(id)) {
        serverIds.push(id)
      }
    })
  }
  
  // Return server objects for these IDs
  return serverIds.map(id => serversStore.getServerById(id)).filter(Boolean)
})

onMounted(async () => {
  try {
    // Load servers first to ensure we have server information
    await serversStore.fetchServers()
    
    // Then load config data
    await configsStore.fetchConfigById(props.id)
  } catch (err) {
    error.value = 'Failed to load configuration details: ' + err.message
  }
})

const isSavingChanges = ref(false)
const jsonValidationError = ref(null)

// Data for storing both types of changes
const jsonEditorContent = ref({})
const configDetailsChanges = ref({})

// Handle JSON content updates from the child component
function onJsonContentUpdated(content) {
  jsonEditorContent.value = content
}

// Handle configuration details updates from details component
function onDetailsUpdated(details) {
  configDetailsChanges.value = details
}

// Handle JSON validation status from the child component
function onJsonValidation(isValid) {
  jsonValidationError.value = isValid ? null : 'JSON validation error'
}

// Cancel editing and return to view mode
function cancelEdit() {
  router.push({ name: 'configDetails', params: { id: props.id } })
}

// Save all changes from both components
async function saveAllChanges() {
  if (jsonValidationError.value) return
  
  isSavingChanges.value = true
  try {
    // First, save the configuration details if there are any changes
    if (Object.keys(configDetailsChanges.value).length > 0) {
      await configsStore.updateConfig(props.id, configDetailsChanges.value)
    }
    
    // Then save the JSON content
    if (jsonEditorContent.value && Object.keys(jsonEditorContent.value).length > 0) {
      await configsStore.updateConfigContent(props.id, { content: jsonEditorContent.value })
    }
    
    // Show success notification
    notify({
      title: "Success",
      text: "All configuration changes saved successfully!",
      type: "success",
      duration: 3000
    })
    
    // Redirect to the details view
    router.push(`/configs/${props.id}`)
  } catch (err) {
    console.error('Error saving configuration:', err)
    error.value = err.message || 'Failed to save configuration'
    
    // Show error notification
    notify({
      title: "Error",
      text: `Failed to save changes: ${err.message || 'Unknown error'}`,
      type: "error",
      duration: 5000
    })
  } finally {
    isSavingChanges.value = false
  }
}
</script>