<template>
  <div class="bg-white rounded-lg shadow border-none p-6 mt-6">
    <h5 class="text-base font-semibold text-gray-600 pb-2 mb-4 border-b border-gray-200 flex items-center">
      <span class="mr-2">Build Information</span>
      <span class="ml-auto text-xs text-gray-400">{{ buildInfo.environment }}</span>
    </h5>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div class="mb-2"><span class="font-medium text-tertiary">App Name:</span> {{ buildInfo.name }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Version:</span> {{ buildInfo.version }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Build Date:</span> {{ formatDate(buildInfo.buildDate) }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Build Number:</span> {{ buildInfo.buildNumber }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Node Version:</span> {{ buildInfo.nodeVersion }}</div>
      </div>
      <div>
        <div class="mb-2"><span class="font-medium text-tertiary">Git Commit:</span> <span class="font-mono">{{ buildInfo.git.shortCommit }}</span></div>
        <div class="mb-2"><span class="font-medium text-tertiary">Branch:</span> {{ buildInfo.git.branch }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Last Commit Date:</span> {{ formatDate(buildInfo.git.lastCommitDate) }}</div>
        <div class="mb-2"><span class="font-medium text-tertiary">Last Commit Message:</span> <span class="text-xs text-gray-500">{{ buildInfo.git.lastCommitMessage }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import buildInfo from '@/build-info.js'

function formatDate(date) {
  if (!date) return 'N/A'
  const d = new Date(date)
  return isNaN(d) ? date : d.toLocaleString()
}
</script>
