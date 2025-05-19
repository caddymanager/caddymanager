<template>
  <div>
    <page-title-comp
      title="User Management"
      :breadcrumbs="[
        { name: 'Home', path: '/' },
        { name: 'Users', path: '/users' }
      ]"
      :primary-button="{ 
        text: 'Create User', 
        action: openCreateUserModal, 
        icon: 'PlusIcon'
      }"
      :is-loading="loading"
    />
    
    <div v-if="errorMessage" class="p-3 mb-5 rounded bg-red-50 text-red-600 border border-red-200">
      {{ errorMessage }}
    </div>
    
    <div v-if="successMessage" class="p-3 mb-5 rounded bg-green-50 text-green-600 border border-green-200">
      {{ successMessage }}
    </div>
    
    <user-list-comp 
      :users="users" 
      :current-user-id="currentUserId"
      @delete-user="confirmDeleteUser" 
      @update-user-role="updateUserRole"
    />
    
    <!-- Modal for creating a new user -->
    <modal-create-user-comp 
      v-model="showCreateModal"
      @close="closeCreateUserModal"
      @user-created="handleUserCreated"
    />
    
    <!-- Confirmation modal for user deletion -->
    <modal-confirm-comp
      v-model="showDeleteModal"
      title="Confirm Delete User"
      :message="`Are you sure you want to delete user ${userToDelete?.username}? This action cannot be undone.`"
      confirm-text="Delete User"
      cancel-text="Cancel"
      processing-text="Deleting..."
      :is-processing="deleteLoading"
      :error="deleteError"
      @confirm="deleteUser"
      @cancel="cancelDelete"
      :dangerous="true"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import UserListComp from '../components/users/userListComp.vue';
import PageTitleComp from '../components/util/pageTitleComp.vue';
import ModalCreateUserComp from '../components/users/modalCreateUserComp.vue';
import ModalConfirmComp from '../components/modals/modalConfirmComp.vue';

const router = useRouter();
const authStore = useAuthStore();

// Data
const users = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const showDeleteModal = ref(false);
const showCreateModal = ref(false);
const userToDelete = ref(null);
const deleteLoading = ref(false);
const deleteError = ref('');

// Computed
const currentUserId = computed(() => authStore.user?.id);

// Lifecycle hooks
onMounted(async () => {
  // Check if user is admin, redirect if not
  if (!authStore.isAdmin) {
    router.push('/dashboard');
    return;
  }
  
  // Fetch all users
  await fetchUsers();
});

// Methods
const fetchUsers = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    
    const response = await authStore.getAllUsers();
    users.value = response.users;
  } catch (error) {
    errorMessage.value = error.message || 'Failed to fetch users';
    console.error('Error fetching users:', error);
  } finally {
    loading.value = false;
  }
};

const confirmDeleteUser = (user) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
  deleteError.value = '';
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  userToDelete.value = null;
  deleteError.value = '';
};

const deleteUser = async () => {
  if (!userToDelete.value || !userToDelete.value._id) {
    console.error('No user ID available for deletion');
    deleteError.value = 'Invalid user ID';
    return;
  }
  
  deleteLoading.value = true;
  deleteError.value = '';
  
  try {
    // Make sure we're passing a valid user ID
    const userId = userToDelete.value._id;
    console.log('Deleting user with ID:', userId);
    
    await authStore.deleteUser(userId);
    
    // Remove user from list after successful deletion
    users.value = users.value.filter(user => user._id !== userId);
    
    // Show success message
    successMessage.value = `User ${userToDelete.value.username} deleted successfully`;
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 5000);
    
    // Close modal
    showDeleteModal.value = false;
    userToDelete.value = null;
  } catch (error) {
    deleteError.value = error.message || 'Failed to delete user';
    errorMessage.value = deleteError.value;
    
    // Hide error message after 5 seconds
    setTimeout(() => {
      errorMessage.value = '';
    }, 5000);
  } finally {
    deleteLoading.value = false;
  }
};

const updateUserRole = async (userId, newRole) => {
  try {
    loading.value = true;
    errorMessage.value = '';
    
    await authStore.updateUserRole({ userId, role: newRole });
    
    // Update the user in the list
    const userIndex = users.value.findIndex(user => user._id === userId);
    if (userIndex !== -1) {
      users.value[userIndex].role = newRole;
    }
    
    // Show success message
    successMessage.value = 'User role updated successfully';
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 5000);
  } catch (error) {
    errorMessage.value = error.message || 'Failed to update user role';
    
    // Hide error message after 5 seconds
    setTimeout(() => {
      errorMessage.value = '';
    }, 5000);
  } finally {
    loading.value = false;
  }
};

const openCreateUserModal = () => {
  showCreateModal.value = true;
};

const closeCreateUserModal = () => {
  showCreateModal.value = false;
};

const handleUserCreated = (newUser) => {
  // Add the new user to the list
  users.value.push(newUser);
  
  // Show success message
  successMessage.value = `User ${newUser.username} created successfully`;
  
  // Hide success message after 5 seconds
  setTimeout(() => {
    successMessage.value = '';
  }, 5000);
};
</script>