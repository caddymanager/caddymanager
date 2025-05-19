<template>
  <div class="profile-card">
    <!-- Profile Info Section -->
    <div class="profile-section">
      <h2>Profile Information</h2>
      
      <div v-if="profileUpdateMessage" class="alert" :class="profileUpdateSuccess ? 'alert-success' : 'alert-danger'">
        {{ profileUpdateMessage }}
      </div>
      
      <form @submit.prevent="updateProfile">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username" 
            v-model="profileForm.username" 
            required 
            class="form-control"
          >
        </div>
        
        <div class="form-group">
          <label for="email">Email (Optional)</label>
          <input 
            type="email" 
            id="email" 
            v-model="profileForm.email" 
            class="form-control"
            placeholder="Add an email address (optional)"
          >
        </div>
        
        <div class="form-info">
          <span><strong>Role:</strong> {{ capitalizeFirstLetter(authStore.getUserRole) }}</span>
          <span><strong>Last Login:</strong> {{ formatDate(authStore.user?.lastLogin) }}</span>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="profileLoading">
            <span v-if="profileLoading">Updating...</span>
            <span v-else>Update Profile</span>
          </button>
        </div>
      </form>
    </div>
    
    <!-- Change Password Section -->
    <div class="profile-section">
      <h2>Change Password</h2>
      
      <div v-if="passwordUpdateMessage" class="alert" :class="passwordUpdateSuccess ? 'alert-success' : 'alert-danger'">
        {{ passwordUpdateMessage }}
      </div>
      
      <form @submit.prevent="changePassword">
        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input 
            type="password" 
            id="currentPassword" 
            v-model="passwordForm.currentPassword" 
            required 
            class="form-control"
          >
        </div>
        
        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input 
            type="password" 
            id="newPassword" 
            v-model="passwordForm.newPassword" 
            required 
            class="form-control"
          >
          <small class="form-text text-muted">Password must be at least 8 characters long</small>
        </div>
        
        <div class="form-group">
          <label for="confirmNewPassword">Confirm New Password</label>
          <input 
            type="password" 
            id="confirmNewPassword" 
            v-model="passwordForm.confirmNewPassword" 
            required 
            class="form-control"
            :class="{ 'is-invalid': passwordsDoNotMatch }"
          >
          <div v-if="passwordsDoNotMatch" class="invalid-feedback">
            Passwords do not match
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="passwordLoading || passwordsDoNotMatch || !isPasswordFormValid">
            <span v-if="passwordLoading">Updating...</span>
            <span v-else>Change Password</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:success']);

const authStore = useAuthStore();

// Profile form state
const profileForm = ref({
  username: '',
  email: ''
});
const profileLoading = ref(false);
const profileUpdateMessage = ref('');
const profileUpdateSuccess = ref(false);

// Password form state
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
});
const passwordLoading = ref(false);
const passwordUpdateMessage = ref('');
const passwordUpdateSuccess = ref(false);

// Computed properties
const passwordsDoNotMatch = computed(() => {
  return passwordForm.value.newPassword && 
         passwordForm.value.confirmNewPassword && 
         passwordForm.value.newPassword !== passwordForm.value.confirmNewPassword;
});

const isPasswordFormValid = computed(() => {
  return passwordForm.value.currentPassword && 
         passwordForm.value.newPassword && 
         passwordForm.value.newPassword.length >= 8 &&
         !passwordsDoNotMatch.value;
});

// Load user data on component mount
onMounted(async () => {
  // Load current user data into form
  if (authStore.user) {
    profileForm.value.username = authStore.user.username;
    profileForm.value.email = authStore.user.email;
  } else {
    // Fetch user data if not in store
    await authStore.fetchCurrentUser();
    if (authStore.user) {
      profileForm.value.username = authStore.user.username;
      profileForm.value.email = authStore.user.email;
    }
  }
});

// Methods
const updateProfile = async () => {
  profileLoading.value = true;
  profileUpdateMessage.value = '';
  
  try {
    await authStore.updateProfile({
      username: profileForm.value.username,
      email: profileForm.value.email
    });
    
    profileUpdateSuccess.value = true;
    profileUpdateMessage.value = 'Profile updated successfully';
    emit('update:success');
  } catch (error) {
    profileUpdateSuccess.value = false;
    profileUpdateMessage.value = error.message || 'Failed to update profile';
  } finally {
    profileLoading.value = false;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      profileUpdateMessage.value = '';
    }, 5000);
  }
};

const changePassword = async () => {
  if (!isPasswordFormValid.value) return;
  
  passwordLoading.value = true;
  passwordUpdateMessage.value = '';
  
  try {
    await authStore.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });
    
    // Clear form after successful password change
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };
    
    passwordUpdateSuccess.value = true;
    passwordUpdateMessage.value = 'Password changed successfully';
  } catch (error) {
    passwordUpdateSuccess.value = false;
    passwordUpdateMessage.value = error.message || 'Failed to change password';
  } finally {
    passwordLoading.value = false;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      passwordUpdateMessage.value = '';
    }, 5000);
  }
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  return date.toLocaleString();
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};
</script>

<style scoped>
.profile-card {
  background-color: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.profile-section {
  padding: 25px;
  border-bottom: 1px solid var(--border-color);
}

.profile-section:last-child {
  border-bottom: none;
}

h2 {
  margin-bottom: 20px;
  font-size: 1.25rem;
  color: var(--color-text);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-input);
  color: var(--color-text);
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.invalid-feedback {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-text {
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
  opacity: 0.7;
}

.form-info {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-secondary);
}

.form-actions {
  margin-top: 25px;
}

.btn {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:disabled {
  background-color: var(--color-primary-disabled);
  cursor: not-allowed;
}

.alert {
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
}

.alert-success {
  background-color: rgba(40, 167, 69, 0.1);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.2);
}

.alert-danger {
  background-color: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.2);
}
</style>