<script setup>
import { computed } from 'vue'
import ServersIndividualCardComp from './serversIndividualCardComp.vue'
import NoServersFoundComp from './noServersFoundComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
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

const hasServers = computed(() => props.servers && props.servers.length > 0)

const emit = defineEmits(['toggle-status', 'add-server', 'server-deleted']);

const handleAddServer = () => {
  emit('add-server');
}

const handleServerDeleted = (serverId) => {
  emit('server-deleted', serverId);
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading servers..."
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
    <NoServersFoundComp v-else-if="!hasServers" @add-server="handleAddServer" />

    <!-- Server cards grid -->
    <ul v-else role="list" class="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8">
      <ServersIndividualCardComp 
        v-for="server in servers" 
        :key="server._id" 
        :server="server"
        @server-deleted="handleServerDeleted"
      />
    </ul>
  </div>
</template>