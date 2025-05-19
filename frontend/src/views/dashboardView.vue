<script setup>
import PageTitleComp from '@/components/util/pageTitleComp.vue'

</script>

<template>
  <main>
    <PageTitleComp 
      title="Dashboard" 
      :breadcrumbs="[
        { name: 'Home', path: '/' }
      ]"
    />
  </main>
</template>