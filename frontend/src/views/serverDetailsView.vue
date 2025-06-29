<template>
  <div class="">
    <page-title-comp 
      :title="server ? `${isEditMode ? 'Edit' : 'Server'}: ${server.name}` : (isEditMode ? 'Edit Server' : 'Server Details')"
      :breadcrumbs="[
        { name: 'Dashboard', path: '/' },
        { name: 'Servers', path: '/servers' },
        { name: server ? server.name : (isEditMode ? 'Edit Server' : 'Server Details'), path: '', active: true }
      ]"
      :secondary-button="{ 
        text: 'Back to Servers', 
        action: () => router.push('/servers')
      }"
      :is-loading="isLoading"
    />
    
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{{ error }}</div>
    
    <div v-if="isLoading && !server" class="flex justify-center items-center py-5">
      <loading-spinner-comp 
        caption="Loading server..."
        color="gradient"
        size="medium"
      />
    </div>
    
    <div v-else-if="server" class="flex flex-col gap-6">
      <!-- Main content with two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left column: Server details (1/3 width) -->
        <div class="flex flex-col h-full">
          <server-details-comp :server-id="id" :is-edit-mode="isEditMode" />
        </div>
        
        <!-- Right column: Configuration details (2/3 width) -->
        <div class="flex flex-col h-full lg:col-span-2">
          <server-running-config-comp :server-id="id" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import ServerDetailsComp from '@/components/servers/serverDetailsComp.vue'
import ServerRunningConfigComp from '@/components/servers/serverRunningConfigComp.vue'
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

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
const serversStore = useCaddyServersStore()

const error = ref(null)
const isLoading = computed(() => serversStore.isLoading)
const server = computed(() => serversStore.getServerById(props.id))

// Function to fetch server data
const fetchServerData = async () => {
  try {
    await serversStore.fetchServerById(props.id)
  } catch (err) {
    error.value = 'Failed to load server details: ' + err.message
  }
}

onMounted(() => {
  fetchServerData()
})
</script>