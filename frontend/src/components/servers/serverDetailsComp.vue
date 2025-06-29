<template>
  <div class="h-full">
    <div v-if="isLoading" class="flex justify-center items-center h-[300px]">
      <LoadingSpinnerComp 
        caption="Loading server..."
        color="gradient"
        size="medium"
        text-color="text-gray-500"
      />
    </div>
    
    <div v-else-if="error" class="alert bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
      {{ error }}
    </div>
    
    <div v-else-if="server" class="bg-white rounded-lg shadow border-none h-full">
      <div class="bg-gray-50 border-b border-gray-100 p-4">
        <h5 class="m-0 font-semibold flex items-center justify-between">
          <div class="flex items-center">
            <ServerIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
            {{ isEditMode ? 'Edit Server' : 'Server Details' }}
          </div>
          <div v-if="server && !isEditMode" class="flex items-center gap-2">
            <button
              @click="checkServerStatus"
              class="inline-flex items-center text-gray-500 hover:text-tertiary focus:outline-none p-1 rounded-full hover:bg-gray-100"
              title="Check server status"
            >
              <ArrowPathIcon 
                class="h-4 w-4" 
                :class="{ 'animate-spin': isStatusChecking }" 
                aria-hidden="true" 
              />
            </button>
            <span :class="[
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
              server.status === 'online' ? 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20' : 
              server.status === 'offline' ? 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/10' : 
              server.status === 'restarting' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/10' : 
              'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-500/10'
            ]">
              {{ server.status || 'Unknown' }}
            </span>
          </div>
        </h5>
      </div>
      
      <div class="p-6">
        <form v-if="isEditMode" @submit.prevent="saveServerChanges">
          <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">
            {{ formError }}
          </div>

          <!-- Server Name -->
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-tertiary mb-1">Server Name</label>
            <input 
              id="name" 
              v-model="formData.name" 
              type="text" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <!-- Server Description -->
          <div class="mb-4">
            <label for="description" class="block text-sm font-medium text-tertiary mb-1">Description</label>
            <textarea 
              id="description" 
              v-model="formData.description"
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              rows="3"
            ></textarea>
          </div>

          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Connection Information</h5>
          
          <!-- API URL -->
          <div class="mb-4">
            <label for="apiUrl" class="block text-sm font-medium text-tertiary mb-1">API URL</label>
            <input 
              id="apiUrl" 
              v-model="formData.apiUrl" 
              type="text" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              required
            />
          </div>
          
          <!-- API Port -->
          <div class="mb-4">
            <label for="apiPort" class="block text-sm font-medium text-tertiary mb-1">API Port</label>
            <input 
              id="apiPort" 
              v-model.number="formData.apiPort" 
              type="number" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="2019"
            />
          </div>
          
          <!-- Admin API Path -->
          <div class="mb-4">
            <label for="adminApiPath" class="block text-sm font-medium text-tertiary mb-1">Admin API Path</label>
            <input 
              id="adminApiPath" 
              v-model="formData.adminApiPath" 
              type="text" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="/config/"
            />
          </div>
          
          <!-- HTTP Port -->
          <div class="mb-4">
            <label for="httpPort" class="block text-sm font-medium text-tertiary mb-1">HTTP Port</label>
            <input 
              id="httpPort" 
              v-model.number="formData.httpPort" 
              type="number" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="80"
            />
          </div>
          
          <!-- HTTPS Port -->
          <div class="mb-4">
            <label for="httpsPort" class="block text-sm font-medium text-tertiary mb-1">HTTPS Port</label>
            <input 
              id="httpsPort" 
              v-model.number="formData.httpsPort" 
              type="number" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="443"
            />
          </div>

          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Server Status</h5>
          
          <!-- Active -->
          <div class="mb-4 flex items-center">
            <input 
              id="active" 
              v-model="formData.active" 
              type="checkbox" 
              class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label for="active" class="ml-2 block text-sm text-tertiary">Active</label>
          </div>

          <!-- Tags -->
          <div class="mb-4">
            <label for="tags" class="block text-sm font-medium text-tertiary mb-1">Server Tags (comma separated)</label>
            <input 
              id="tags" 
              v-model="tagsInput" 
              type="text" 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="production, web, europe"
            />
          </div>

          <!-- Buttons -->
          <div class="flex justify-between mt-6 pt-4 border-t border-gray-200">
            <RouterLink 
              :to="{ name: 'serverDetails', params: { id: serverId } }" 
              class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
            >
              Cancel
            </RouterLink>
            <button 
              type="submit" 
              class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              :disabled="isSaving"
            >
              <span v-if="isSaving" class="mr-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              Save Changes
            </button>
          </div>
        </form>
        
        <div v-else>
          <div v-if="server.description" class="mb-4">
            <p class="text-gray-500">{{ server.description }}</p>
          </div>
          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Connection Information</h5>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">API URL</div>
              <div class="flex-1">{{ server.apiUrl }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">API Port</div>
              <div class="flex-1">{{ server.apiPort || 'Default (2019)' }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Admin API Path</div>
              <div class="flex-1">{{ server.adminApiPath || '/config/' }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">HTTP Port</div>
              <div class="flex-1">{{ server.httpPort || 'Default (80)' }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">HTTPS Port</div>
              <div class="flex-1">{{ server.httpsPort || 'Default (443)' }}</div>
            </div>
          </div>
          
          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Status Information</h5>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Current Status</div>
              <div class="flex-1">
                <span :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                  server.status === 'online' ? 'bg-green-100 text-green-800' : 
                  server.status === 'offline' ? 'bg-red-100 text-red-800' : 
                  server.status === 'restarting' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-800'
                ]">
                  {{ server.status || 'Unknown' }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Active State</div>
              <div class="flex-1">
                <span :class="[
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                  server.active ? 'bg-accent-2 text-green-800 ring-1 ring-inset ring-green-600/20' : 
                  'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-600/20'
                ]">
                  {{ server.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Last Pinged</div>
              <div class="flex-1">{{ formatDate(server.lastPinged) }}</div>
            </div>
          </div>
          
          <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200">Server History</h5>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Created On</div>
              <div class="flex-1">{{ formatDate(server.createdAt) }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Updated On</div>
              <div class="flex-1">{{ formatDate(server.updatedAt) }}</div>
            </div>
            <div class="flex flex-wrap gap-2 py-1">
              <div class="font-semibold min-w-[120px] text-gray-600 flex-[0_0_30%]">Server Tags</div>
              <div class="flex-1">
                <span v-if="server.tags && server.tags.length" 
                      v-for="tag in server.tags" 
                      :key="tag" 
                      class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 mr-1 mb-1">{{ tag }}</span>
                <span v-else class="text-gray-500">No tags</span>
              </div>
            </div>
          </div>
          
          <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-200">
            <RouterLink :to="{ name: 'servers' }" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50">
              <ArrowLeftIcon class="h-4 w-4 mr-1" aria-hidden="true" />
              Back to Servers
            </RouterLink>
            <RouterLink 
              :to="{ name: 'serverEdit', params: { id: serverId } }" 
              class="inline-flex items-center rounded-md bg-accent-1 px-3 py-2 text-sm font-semibold text-white hover:bg-accent-1-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-1"
            >
              <PencilIcon class="h-4 w-4 mr-1" aria-hidden="true" />
              Edit Server
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
      No server information available
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import { ServerIcon, ArrowLeftIcon, PencilIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { RouterLink, useRouter } from 'vue-router'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

const props = defineProps({
  serverId: {
    type: String,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const serversStore = useCaddyServersStore()
const isLoading = computed(() => serversStore.isLoading)
const error = computed(() => serversStore.error)
const server = computed(() => serversStore.getServerById(props.serverId))

// Status check loading state
const isStatusChecking = ref(false)

// Check server status manually
const checkServerStatus = async () => {
  if (isStatusChecking.value) return
  
  isStatusChecking.value = true
  try {
    await serversStore.checkServerStatus(props.serverId)
  } catch (error) {
    console.error('Error checking server status:', error)
  } finally {
    isStatusChecking.value = false
  }
}

// Form-related refs
const formError = ref(null)
const isSaving = ref(false)
const formData = ref({
  name: '',
  description: '',
  apiUrl: '',
  apiPort: 2019,
  adminApiPath: '/config/',
  httpPort: null,
  httpsPort: null,
  active: true,
  tags: []
})

// Tags input for simplified editing
const tagsInput = ref('')

// Initialize form data when server data is loaded
watch(server, (newServer) => {
  if (newServer) {
    formData.value = {
      name: newServer.name || '',
      description: newServer.description || '',
      apiUrl: newServer.apiUrl || '',
      apiPort: newServer.apiPort || 2019,
      adminApiPath: newServer.adminApiPath || '/config/',
      httpPort: newServer.httpPort || null,
      httpsPort: newServer.httpsPort || null,
      active: newServer.active !== undefined ? newServer.active : true,
      tags: newServer.tags || []
    }
    // Join tags as comma-separated string for the input field
    tagsInput.value = newServer.tags ? newServer.tags.join(', ') : ''
  }
}, { immediate: true })

// Save server changes
async function saveServerChanges() {
  formError.value = null
  isSaving.value = true
  try {
    // Process tags from the input field
    const tags = tagsInput.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '')
    // Prepare the data to send
    const dataToUpdate = { 
      ...formData.value,
      tags 
    }
    // Call the store method to update the server
    const result = await serversStore.updateServer(props.serverId, dataToUpdate)
    if (result) {
      // Redirect to the server details page after successful update
      router.push({ name: 'serverDetails', params: { id: props.serverId } })
    } else {
      formError.value = 'Failed to update server details'
    }
  } catch (err) {
    formError.value = err.message || 'Failed to save changes'
  } finally {
    isSaving.value = false
  }
}

function formatDate(date) {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
}
</script>