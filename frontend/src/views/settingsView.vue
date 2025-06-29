<script setup>
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import BuildInfoComp from '@/components/dashboard/buildInfoComp.vue'
</script>

<template>
  <main>
    <PageTitleComp 
      title="Settings" 
      :breadcrumbs="[
        { name: 'Home', path: '/' },
        { name: 'Settings', path: '/settings' }
      ]"
    />
    <h3>At this moment, there are no settings available.</h3>
    <p>Settings will be added in a future release.</p>
    <BuildInfoComp />
  </main>
</template>