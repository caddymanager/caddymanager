<template>
  <div>
    <page-title-comp
      title="Profile Settings"
      :breadcrumbs="[
        { name: 'Home', path: '/' },
        { name: 'User', path: '#' },
        { name: 'Profile', path: '/profile' }
      ]"
    />
    
    <user-profile-comp @update:success="handleProfileUpdate" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import UserProfileComp from '../components/users/userProfileComp.vue';
import PageTitleComp from '../components/util/pageTitleComp.vue';

const handleProfileUpdate = () => {
};
</script>