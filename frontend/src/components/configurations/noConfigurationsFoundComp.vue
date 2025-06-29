<template>
  <div class="bg-white border border-gray-200 rounded-lg p-8 text-center">
    <DocumentTextIcon class="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
    <h3 class="mt-2 text-sm font-semibold text-gray-900">No configurations found</h3>
    <p class="mt-1 text-sm text-gray-500">Get started by adding your first Caddy configuration.</p>
    <div class="mt-6">
      <RouterLink 
        to="/configs/create"
        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <PlusIcon class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        Add Configuration
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { DocumentTextIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { RouterLink } from 'vue-router'
</script>