<template>
  <modal-form-comp
    v-model="show"
    title="Create New User"
    size="md"
    :submit-text="loading ? 'Creating...' : 'Create User'"
    :is-submit-disabled="loading || !isFormValid"
    @submit="createUser"
    @cancel="closeModal"
  >
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">
      {{ error }}
    </div>
    
    <form @submit.prevent="createUser">
      <div class="mb-4">
        <label for="username" class="block text-sm font-medium text-tertiary mb-1">Username</label>
        <InputFieldComp
          type="text"
          id="username"
          v-model="form.username"
          required
          placeholder="Enter username"
          :extraClass="errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'placeholder:text-gray-300'"
        />
        <div v-if="errors.username" class="mt-1 text-sm text-red-600">
          {{ errors.username }}
        </div>
        <p class="mt-1 text-xs text-gray-500">Username must be at least 3 characters long</p>
      </div>
      
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium text-tertiary mb-1">Email (Optional)</label>
        <InputFieldComp
          type="email"
          id="email"
          v-model="form.email"
          placeholder="Enter email (optional)"
          :extraClass="errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'placeholder:text-gray-300'"
        />
        <div v-if="errors.email" class="mt-1 text-sm text-red-600">
          {{ errors.email }}
        </div>
      </div>
      
      <div class="mb-4">
        <label for="password" class="block text-sm font-medium text-tertiary mb-1">Password</label>
        <InputFieldComp
          type="password"
          id="password"
          v-model="form.password"
          required
          placeholder="Enter password"
          :extraClass="errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'placeholder:text-gray-300'"
        />
        <div v-if="errors.password" class="mt-1 text-sm text-red-600">
          {{ errors.password }}
        </div>
        <p class="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
      </div>
      
      <div class="mb-4">
        <label for="confirmPassword" class="block text-sm font-medium text-tertiary mb-1">Confirm Password</label>
        <InputFieldComp
          type="password"
          id="confirmPassword"
          v-model="form.confirmPassword"
          required
          placeholder="Confirm password"
          :extraClass="passwordsDoNotMatch ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'placeholder:text-gray-300'"
        />
        <div v-if="passwordsDoNotMatch" class="mt-1 text-sm text-red-600">
          Passwords do not match
        </div>
      </div>
      
      <div class="mb-4">
        <label for="role" class="block text-sm font-medium text-tertiary mb-1">Role</label>
        <SelectFieldComp
          id="role"
          v-model="form.role"
          :options="[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Administrator' }]"
          required
        />
      </div>
    </form>
  </modal-form-comp>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import ModalFormComp from '../modals/modalFormComp.vue';
import InputFieldComp from '@/components/util/inputFieldComp.vue'
import SelectFieldComp from '@/components/util/selectFieldComp.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'close', 'user-created']);
const authStore = useAuthStore();

// Control modal visibility with v-model
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Form state
const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'user'
});

const loading = ref(false);
const error = ref('');
const errors = ref({
  username: '',
  email: '',
  password: ''
});

// Watch for modal visibility changes
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    resetForm();
  }
});

// Computed properties
const passwordsDoNotMatch = computed(() => {
  return form.value.password && 
         form.value.confirmPassword && 
         form.value.password !== form.value.confirmPassword;
});

const isFormValid = computed(() => {
  return form.value.username.trim().length >= 3 && 
         form.value.password.length >= 8 &&
         !passwordsDoNotMatch.value &&
         !errors.value.username &&
         !errors.value.email &&
         !errors.value.password;
});

// Methods
const validateForm = () => {
  errors.value = {
    username: '',
    email: '',
    password: ''
  };
  
  if (form.value.username.trim().length < 3) {
    errors.value.username = 'Username must be at least 3 characters long';
  }
  
  if (form.value.email && !isValidEmail(form.value.email)) {
    errors.value.email = 'Please enter a valid email address';
  }
  
  if (form.value.password.length < 8) {
    errors.value.password = 'Password must be at least 8 characters long';
  }
  
  return !errors.value.username && !errors.value.email && !errors.value.password;
};

const createUser = async () => {
  if (!validateForm() || passwordsDoNotMatch.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const userData = {
      username: form.value.username,
      password: form.value.password,
      role: form.value.role
    };
    
    // Only include email if provided
    if (form.value.email.trim()) {
      userData.email = form.value.email;
    }
    
    // Use a createUser method from authStore
    const response = await authStore.createUser(userData);
    
    // Emit the new user data
    emit('user-created', response.user);
    
    // Reset the form
    resetForm();
    
    // Close the modal
    closeModal();
  } catch (err) {
    error.value = err.message || 'Failed to create user';
  } finally {
    loading.value = false;
  }
};

const closeModal = () => {
  emit('close');
  emit('update:modelValue', false);
};

const resetForm = () => {
  form.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  };
  error.value = '';
  errors.value = {
    username: '',
    email: '',
    password: ''
  };
};

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
</script>