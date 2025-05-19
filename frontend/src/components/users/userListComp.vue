<template>
  <div>
    <!-- Success message toast -->
    <div 
      v-if="showSuccessMessage" 
      class="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 animate-fade-in-out"
    >
      {{ successMessage }}
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <LoadingSpinnerComp 
        caption="Loading users..."
        color="gradient"
        size="small"
        text-color="text-gray-500"
      />
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <p class="text-red-700">{{ error }}</p>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="!users || users.length === 0" class="py-10 px-5 text-center text-gray-500 bg-white shadow-sm rounded-lg border border-gray-200">
      <UserIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
      <p class="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
    </div>
    
    <!-- Users table -->
    <div v-else class="flow-root bg-white shadow-sm rounded-lg border border-gray-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary sm:pl-6">Username</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Email</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Role</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Last Login</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-secondary">Created At</th>
              <th scope="col" class="relative py-3.5 pl-3 pr-6">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in users" :key="user._id" :class="{ 'bg-blue-50': user._id === currentUserId }" class="hover:bg-gray-50">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 text-secondary">
                {{ user.username }}
                <span v-if="user._id === currentUserId" class="ml-1 text-xs italic text-gray-500">(You)</span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ user.email || 'Not set' }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm">
                <span :class="['inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', getRoleClass(user.role)]">
                  {{ capitalizeFirstLetter(user.role) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDate(user.lastLogin) }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDate(user.createdAt) }}</td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-4">
                  <!-- Role toggle for non-current users -->
                  <button 
                    v-if="user._id !== currentUserId"
                    class="text-secondary hover:text-secondary-dark flex items-center"
                    @click="toggleUserRole(user)"
                    :title="user.role === 'user' ? 'Promote to Admin' : 'Demote to User'"
                  >
                    <PencilIcon class="h-4 w-4 mr-1" />
                    <span>{{ user.role === 'user' ? 'Promote' : 'Demote' }}</span>
                  </button>
                  
                  <!-- Delete button for any user (except current user) -->
                  <button 
                    v-if="user._id !== currentUserId"
                    class="text-red-600 hover:text-red-800 flex items-center"
                    @click="deleteUser(user)"
                    title="Delete User"
                  >
                    <TrashIcon class="h-4 w-4 mr-1" />
                    <span>Delete</span>
                  </button>
                  
                  <!-- Current user cannot be acted upon -->
                  <span v-if="user._id === currentUserId" class="text-xs italic text-gray-500">
                    (Current user)
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { EyeIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/vue/24/outline';
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue';

// Props
const props = defineProps({
  users: {
    type: Array,
    required: true
  },
  currentUserId: {
    type: String,
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
});

// Emits
const emit = defineEmits(['delete-user', 'update-user-role']);

// Success message toast state
const showSuccessMessage = ref(false);
const successMessage = ref('');

// Methods
const deleteUser = (user) => {
  // Simply emit the event to the parent component
  emit('delete-user', user);
};

const toggleUserRole = (user) => {
  const newRole = user.role === 'user' ? 'admin' : 'user';
  emit('update-user-role', user._id, newRole);
  
  // Show success message
  successMessage.value = `User role updated to ${newRole}`;
  showSuccessMessage.value = true;
  
  // Hide success message after a delay
  setTimeout(() => {
    showSuccessMessage.value = false;
  }, 3000);
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Computed function to get role badge styling
const getRoleClass = (role) => {
  switch(role) {
    case 'admin':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
    case 'user':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-600/10';
  }
};
</script>

<style scoped>
.animate-fade-in-out {
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
</style>