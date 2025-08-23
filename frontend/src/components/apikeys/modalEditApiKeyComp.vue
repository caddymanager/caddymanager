<template>
  <ModalFormComp
    v-model="showModal"
    title="Edit API Key"
    submit-text="Update API Key"
    @submit="updateApiKey"
    @cancel="$emit('update:modelValue', false)"
  >
    <form @submit.prevent="updateApiKey" v-if="editingKey" class="text-gray-700">
      <div class="mb-4">
        <InputFieldComp
          id="editKeyName"
          v-model="editingKey.name"
          label="Name"
          required
          minlength="3"
        />
      </div>
      
      <div class="mt-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
        <div class="space-y-2">
          <CheckboxFieldComp v-model="editingKey.permissions.read">Read (GET)</CheckboxFieldComp>
          <CheckboxFieldComp class="ml-4" v-model="editingKey.permissions.write">Write (POST/PUT)</CheckboxFieldComp>
          <CheckboxFieldComp class="ml-4" v-model="editingKey.permissions.delete">Delete</CheckboxFieldComp>
        </div>
      </div>
      
      <div class="mt-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <div>
          <CheckboxFieldComp v-model="editingKey.isActive">Active</CheckboxFieldComp>
        </div>
      </div>

      <div class="mt-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
        <p class="text-sm text-gray-500">
          Expires {{ formatDate(editingKey.expiresAt) }}
          <span v-if="isExpired" class="text-red-500 ml-2">(Expired)</span>
          <span v-else-if="expiresInDays < 30" class="text-yellow-500 ml-2">(Expires in {{ expiresInDays }} days)</span>
        </p>
      </div>

      <div class="mt-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Usage Information</label>
        <p class="text-sm text-gray-500">Created: {{ formatDate(editingKey.createdAt) }}</p>
        <p class="text-sm text-gray-500">
          Last used: {{ editingKey.lastUsed ? formatDate(editingKey.lastUsed) : 'Never' }}
        </p>
      </div>
    </form>

    <template #footer>
      <button 
        type="button" 
        @click="$emit('update:modelValue', false)" 
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tertiary"
      >
        Cancel
      </button>
      <button 
        type="button" 
        @click="updateApiKey" 
        class="ml-3 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Update API Key
      </button>
    </template>
  </ModalFormComp>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useApiKeyStore } from '../../stores/apiKeyStore';
import ModalFormComp from '../modals/modalFormComp.vue';
import InputFieldComp from '../util/inputFieldComp.vue';
import CheckboxFieldComp from '../util/checkboxFieldComp.vue';

// Props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  apiKey: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'key-updated']);

// Store
const apiKeyStore = useApiKeyStore();

// Reactive state
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const editingKey = ref(null);

// Computed properties
const isExpired = computed(() => {
  if (!editingKey.value?.expiresAt) return false;
  return new Date(editingKey.value.expiresAt) < new Date();
});

const expiresInDays = computed(() => {
  if (!editingKey.value?.expiresAt) return 0;
  
  const expirationDate = new Date(editingKey.value.expiresAt);
  const today = new Date();
  const diffTime = expirationDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Watch for key changes to update the editing state
watch(() => props.apiKey, (newKey) => {
  if (newKey) {
    // Clone the key to avoid directly modifying props
    editingKey.value = JSON.parse(JSON.stringify(newKey));
  }
}, { immediate: true });

// Methods
const updateApiKey = async () => {
  if (!editingKey.value) return;
  
  try {
    await apiKeyStore.updateApiKey(editingKey.value._id, {
      name: editingKey.value.name,
      permissions: editingKey.value.permissions,
      isActive: editingKey.value.isActive
    });
    
    emit('update:modelValue', false);
    emit('key-updated');
  } catch (error) {
    console.error('Failed to update API key:', error);
  }
};

// Helper method to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
</script>