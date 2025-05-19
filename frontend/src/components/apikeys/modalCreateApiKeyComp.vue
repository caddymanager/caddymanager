<template>
  <ModalFormComp
    v-model="showModal"
    title="Create New API Key"
    submit-text="Create API Key"
    @submit="createApiKey"
    @cancel="$emit('update:modelValue', false)"
  >
    <form @submit.prevent="createApiKey">
      <div class="mb-4">
        <label for="keyName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input 
          id="keyName" 
          v-model="newKey.name" 
          type="text" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          required 
          minlength="3"
          placeholder="My API Key"
        >
      </div>
      
      <div class="mt-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
        <div class="space-y-2">
          <label class="inline-flex items-center">
            <input type="checkbox" v-model="newKey.permissions.read" class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"> 
            <span class="ml-2 text-sm text-gray-700">Read (GET)</span>
          </label>
          <label class="inline-flex items-center ml-4">
            <input type="checkbox" v-model="newKey.permissions.write" class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"> 
            <span class="ml-2 text-sm text-gray-700">Write (POST/PUT)</span>
          </label>
          <label class="inline-flex items-center ml-4">
            <input type="checkbox" v-model="newKey.permissions.delete" class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"> 
            <span class="ml-2 text-sm text-gray-700">Delete</span>
          </label>
        </div>
      </div>
      
      <div class="mt-4 mb-4">
        <label for="expiration" class="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
        <select 
          id="expiration" 
          v-model="expirationOption"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="1year">1 Year</option>
          <option value="6months">6 Months</option>
          <option value="3months">3 Months</option>
          <option value="1month">1 Month</option>
          <option value="custom">Custom Date</option>
        </select>
        
        <input 
          v-if="expirationOption === 'custom'" 
          type="date" 
          v-model="customExpiration"
          :min="minExpirationDate"
          class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
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
        @click="createApiKey" 
        class="ml-3 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Create API Key
      </button>
    </template>
  </ModalFormComp>

  <!-- Display the newly created key -->
  <ModalFormComp
    v-model="showNewKeyModal"
    title="API Key Created"
    submit-text="I've Copied My Key"
    :show-default-footer="false"
    @submit="closeNewKeyModal"
    @cancel="closeNewKeyModal"
  >
    <p class="text-red-600 font-medium mb-4">
      Copy and save your API key now. For security reasons, it will not be displayed again.
    </p>
    
    <div class="bg-gray-100 p-4 rounded-md relative mb-6">
      <code class="text-sm break-all">{{ newlyCreatedKey?.key || '' }}</code>
      <button 
        @click="copyApiKey" 
        class="absolute top-2 right-2 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark"
      >
        Copy
      </button>
    </div>
    
    <h3 class="text-lg font-medium text-gray-900 mb-2">How to use this API key</h3>
    <p class="mb-2">Include your API key in requests by using one of these methods:</p>
    
    <div class="bg-gray-100 p-4 rounded-md mb-4">
      <h4 class="text-sm font-medium">Authorization Header</h4>
      <pre class="text-xs mt-1 bg-gray-200 p-2 rounded">Authorization: ApiKey {{ newlyCreatedKey?.key || 'YOUR_API_KEY' }}</pre>
      
      <h4 class="text-sm font-medium mt-3">X-API-Key Header</h4>
      <pre class="text-xs mt-1 bg-gray-200 p-2 rounded">X-API-Key: {{ newlyCreatedKey?.key || 'YOUR_API_KEY' }}</pre>
    </div>
    
    <div class="flex justify-end">
      <button 
        @click="closeNewKeyModal" 
        class="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        I've Copied My Key
      </button>
    </div>
  </ModalFormComp>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useApiKeyStore } from '../../stores/apiKeyStore';
import ModalFormComp from '../modals/modalFormComp.vue';

// Props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'key-created']);

// Store
const apiKeyStore = useApiKeyStore();

// Reactive state
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const showNewKeyModal = ref(false);
const newKey = ref({
  name: '',
  permissions: {
    read: true,
    write: false,
    delete: false
  }
});
const expirationOption = ref('1year');
const customExpiration = ref('');

// Computed properties
const minExpirationDate = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
});

const newlyCreatedKey = computed(() => {
  return apiKeyStore.newlyCreatedKey;
});

// Watch for modal being opened to reset the form
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Reset the form
    newKey.value = {
      name: '',
      permissions: {
        read: true,
        write: false,
        delete: false
      }
    };
    expirationOption.value = '1year';
    customExpiration.value = '';
  }
});

// Methods
const createApiKey = async () => {
  let expiration;
  
  switch(expirationOption.value) {
    case '1year':
      expiration = new Date();
      expiration.setFullYear(expiration.getFullYear() + 1);
      break;
    case '6months':
      expiration = new Date();
      expiration.setMonth(expiration.getMonth() + 6);
      break;
    case '3months':
      expiration = new Date();
      expiration.setMonth(expiration.getMonth() + 3);
      break;
    case '1month':
      expiration = new Date();
      expiration.setMonth(expiration.getMonth() + 1);
      break;
    case 'custom':
      expiration = new Date(customExpiration.value);
      break;
  }
  
  try {
    await apiKeyStore.createApiKey({
      name: newKey.value.name,
      permissions: newKey.value.permissions,
      expiration: expiration.toISOString()
    });
    
    // Close the create modal and show the new key modal
    showModal.value = false;
    showNewKeyModal.value = true;
    
    // Emit event for parent components
    emit('key-created');
  } catch (error) {
    console.error('Failed to create API key:', error);
  }
};

const copyApiKey = () => {
  if (apiKeyStore.newlyCreatedKey?.key) {
    navigator.clipboard.writeText(apiKeyStore.newlyCreatedKey.key)
      .then(() => {
        alert('API key copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy API key:', err);
      });
  }
};

const closeNewKeyModal = () => {
  showNewKeyModal.value = false;
  apiKeyStore.clearNewlyCreatedKey();
};
</script>