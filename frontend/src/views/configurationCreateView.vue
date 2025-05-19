<template>
  <div class="">
    <page-title-comp 
      title="Create New Configuration"
      :breadcrumbs="[
        { name: 'Dashboard', path: '/' },
        { name: 'Configurations', path: '/configs' },
        { name: 'Create Configuration', path: '', active: true }
      ]"
      :secondary-button="{ 
        text: 'Cancel', 
        action: () => router.push('/configs')
      }"
    />
    
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">{{ error }}</div>
    
    <!-- Main content with two-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:grid-flow-col">
      <!-- Left column: Config details (1/3 width) -->
      <div class="lg:self-start w-full">
        <configuration-create-details-comp @details-updated="onDetailsUpdated" />
      </div>
      
      <!-- Right column: Configuration content details (2/3 width) -->
      <div class="lg:col-span-2 flex flex-col">
        <configuration-create-data-comp 
          @json-content-updated="onJsonContentUpdated"
          @json-validation="onJsonValidation"
        />
      </div>
    </div>
    
    <!-- Action buttons -->
    <div class="flex justify-end pt-6 mt-4 border-t border-gray-200">
      <button 
        @click="() => router.push('/configs')"
        class="inline-flex items-center rounded-md bg-white mr-2 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button 
        @click="createConfiguration"
        class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        :disabled="isCreating || !!jsonValidationError || !isFormValid"
      >
        <span v-if="isCreating" class="mr-2">
          <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
        <span v-else>
          Create Configuration
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import ConfigurationCreateDetailsComp from '@/components/configurations/configurationCreateDetailsComp.vue'
import ConfigurationCreateDataComp from '@/components/configurations/configurationCreateDataComp.vue'
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import { useNotification } from "@kyvg/vue3-notification"

const router = useRouter()
const configsStore = useCaddyConfigsStore()
const serversStore = useCaddyServersStore()
const { notify } = useNotification()

// State variables
const error = ref(null)
const isCreating = ref(false)
const jsonValidationError = ref(null)

// Data for storing configuration details and content
const configDetails = ref({
  name: '',
  status: 'draft',
  format: 'json',
  serverId: '',
  metadata: {
    description: '',
    version: '',
    tags: []
  }
})
const jsonContent = ref({
  apps: {
    http: {
      servers: {
        myserver: {
          listen: [":80"],
          routes: []
        }
      }
    }
  }
})

// Check if the form is valid
const isFormValid = computed(() => {
  // Require at least a name
  return configDetails.value && configDetails.value.name;
})

// Handle configuration details updates from the details component
function onDetailsUpdated(details) {
  configDetails.value = details
}

// Handle JSON content updates from the data component
function onJsonContentUpdated(content) {
  jsonContent.value = content
}

// Handle JSON validation status from the data component
function onJsonValidation(isValid) {
  jsonValidationError.value = isValid ? null : 'JSON validation error'
}

// Create a new configuration
async function createConfiguration() {
  if (!isFormValid.value || jsonValidationError.value) {
    error.value = 'Please fill in all required fields and fix any validation errors.'
    return
  }
  
  isCreating.value = true
  error.value = null
  
  try {
    // Prepare the configuration data
    const configData = {
      name: configDetails.value.name,
      status: configDetails.value.status || 'draft',
      format: 'json',
      jsonConfig: jsonContent.value,
      metadata: configDetails.value.metadata || {}
    }
    
    // Handle server selection
    if (configDetails.value.serverId) {
      configData.servers = [configDetails.value.serverId]
    }
    
    let newConfig = null;
    
    // Try using addConfig if available, otherwise fall back to createConfig
    if (typeof configsStore.addConfig === 'function') {
      // Create using the new endpoint
      newConfig = await configsStore.addConfig(configData);
    } else {
      // Fall back to the old method if addConfig is not available
      newConfig = await configsStore.createConfig(null, configData);
    }
    
    if (newConfig) {
      // Show success notification
      notify({
        title: "Success",
        text: "Configuration created successfully!",
        type: "success",
        duration: 3000
      })
      
      // Redirect to the configurations list or the new config's details
      router.push(`/configs/${newConfig._id}`)
    } else {
      throw new Error('Failed to create configuration')
    }
  } catch (err) {
    console.error('Error creating configuration:', err)
    error.value = err.message || 'Failed to create configuration'
    
    notify({
      title: "Error",
      text: `Failed to create configuration: ${err.message || 'Unknown error'}`,
      type: "error",
      duration: 5000
    })
  } finally {
    isCreating.value = false
  }
}
</script>