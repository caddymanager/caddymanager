<script setup>
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import BuildInfoComp from '@/components/dashboard/buildInfoComp.vue'
</script>

<template>
  <main>
    <PageTitleComp 
      title="Dashboard" 
      :breadcrumbs="[
        { name: 'Home', path: '/' }
      ]"
    />
    <BuildInfoComp />
  </main>
</template>