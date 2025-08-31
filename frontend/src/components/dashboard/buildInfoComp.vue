<template>
  <div class="w-full">
    <!-- Frontend Build Info -->
    <div class="bg-white rounded-lg shadow border-none p-6 mb-6">
      <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200 flex items-center">
        <span class="mr-2">Frontend Build</span>
        <span class="ml-auto text-xs text-gray-400">{{ frontendBuildInfo.environment }}</span>
      </h5>
      <div>
        <div class="mb-2"><span class="font-medium text-tertiary">App Name:</span> {{ frontendBuildInfo.name }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Version:</span> {{ frontendBuildInfo.version }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Build Date:</span> {{ formatDate(frontendBuildInfo.buildDate) }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Build Number:</span> {{ frontendBuildInfo.buildNumber }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Node Version:</span> {{ frontendBuildInfo.nodeVersion }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Git Commit:</span> <span class="font-mono">{{ frontendBuildInfo.git?.shortCommit }}</span></div>
        <div class="mb-2"><span class="font-medium text-tertiary">Branch:</span> {{ frontendBuildInfo.git?.branch }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Last Commit Date:</span> {{ formatDate(frontendBuildInfo.git?.lastCommitDate) }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Last Commit Message:</span> <span class="text-xs text-gray-500">{{ frontendBuildInfo.git?.lastCommitMessage }}</span></div>
      </div>
  </div>

  <!-- Backend Build Info -->
  <div class="bg-white rounded-lg shadow border-none p-6">
      <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200 flex items-center">
        <span class="mr-2">Backend Build</span>
        <span v-if="backendBuildInfo" class="ml-auto text-xs text-gray-400">{{ backendBuildInfo.environment }}</span>
      </h5>
  <div v-if="loading && !initialLoaded" class="text-gray-400">Loading backend build info...</div>
      <div v-else-if="error" class="text-red-500">{{ error }}</div>
      <div v-else-if="backendBuildInfo">
        <div class="mb-2"><span class="font-medium text-tertiary">App Name:</span> {{ backendBuildInfo.name }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Version:</span> {{ backendBuildInfo.version }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Build Date:</span> {{ formatDate(backendBuildInfo.buildDate) }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Build Number:</span> {{ backendBuildInfo.buildNumber }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Node Version:</span> {{ backendBuildInfo.nodeVersion }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Platform:</span> {{ backendBuildInfo.runtime?.platform }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Arch:</span> {{ backendBuildInfo.runtime?.arch }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">PID:</span> {{ backendBuildInfo.runtime?.pid }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Uptime:</span> {{ backendBuildInfo.runtime?.uptimeFormatted }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Git Commit:</span> <span class="font-mono">{{ backendBuildInfo.git?.shortCommit }}</span></div>
        <div class="mb-2"><span class="font-medium text-tertiary">Branch:</span> {{ backendBuildInfo.git?.branch }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Last Commit Date:</span> {{ formatDate(backendBuildInfo.git?.lastCommitDate) }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Last Commit Message:</span> <span class="text-xs text-gray-500">{{ backendBuildInfo.git?.lastCommitMessage }}</span></div>
        <div class="mb-2"><span class="font-medium text-tertiary">Memory Usage:</span> <span class="font-mono">{{ backendBuildInfo.runtime?.memory?.rss }} bytes RSS</span></div>
        <div class="mb-2"><span class="font-medium text-tertiary">Current Time:</span> {{ formatDate(backendBuildInfo.runtime?.currentTime) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import apiService from '@/services/apiService'
import frontendBuildInfo from '@/build-info.js'

const backendBuildInfo = ref(null)
const loading = ref(true)
const error = ref(null)
const initialLoaded = ref(false)

function formatDate(date) {
  if (!date) return 'N/A'
  const d = new Date(date)
  return isNaN(d) ? date : d.toLocaleString()
}
// Handler for dashboard refresh events. Declared and registered synchronously so
// lifecycle hooks (onBeforeUnmount) are registered during setup, avoiding Vue warnings.
const handler = async () => {
  // On subsequent refreshes, don't show the initial loading placeholder — update silently
  try {
    const response = await apiService.get('/build-info')
    backendBuildInfo.value = response.data.data
  } catch (err) {
    error.value = 'Failed to load backend build info'
    console.error(err)
  } finally {
    // mark that we've at least loaded once
    initialLoaded.value = true
    loading.value = false
  }
}

// Register listener immediately (during setup) and ensure cleanup is registered synchronously
window.addEventListener('dashboard:refresh', handler)
onBeforeUnmount(() => window.removeEventListener('dashboard:refresh', handler))

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const response = await apiService.get('/build-info')
    backendBuildInfo.value = response.data.data
  } catch (err) {
    error.value = 'Failed to load backend build info'
    console.error(err)
  } finally {
    loading.value = false
    initialLoaded.value = true
  }
})
</script>
