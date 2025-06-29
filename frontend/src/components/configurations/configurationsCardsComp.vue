<script setup>
import { computed } from 'vue'
import ConfigurationsIndividualCardComp from './configurationsIndividualCardComp.vue'
import NoConfigurationsFoundComp from './noConfigurationsFoundComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

const props = defineProps({
  configs: {
    type: Array,
    required: true
  },
  servers: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['refresh'])

const hasConfigs = computed(() => props.configs && props.configs.length > 0)

// Get server names from the configuration
const getServerNamesUsingConfig = (config) => {
  if (!config || !config.servers) return []

  return config.servers.map(serverObj => {
    if (serverObj && serverObj.name) {
      return serverObj.name
    }
    
    // If only server ID is provided in the config, find the server name from props.servers
    const serverId = typeof serverObj === 'object' ? serverObj._id : serverObj
    const server = props.servers.find(s => s._id === serverId)
    return server ? server.name : 'N/A'
  }).filter(Boolean)
}

// Handle configuration deletion
const handleDeleteConfig = async (configId) => {
  try {
    // Emit refresh event to parent component to update the list
    emit('refresh')
  } catch (error) {
    console.error('Failed to delete configuration:', error)
  }
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading configurations..."
        color="gradient"
        size="small"
        text-color="text-gray-500"
      />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- Empty state -->
    <NoConfigurationsFoundComp v-else-if="!hasConfigs" />

    <!-- Config cards grid -->
    <ul v-else role="list" class="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8">
      <ConfigurationsIndividualCardComp 
        v-for="config in configs" 
        :key="config._id" 
        :config="config"
        :serverName="getServerNamesUsingConfig(config)"
        @delete-success="handleDeleteConfig"
      />
    </ul>
  </div>
</template>