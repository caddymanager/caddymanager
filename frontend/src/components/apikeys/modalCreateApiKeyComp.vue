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
        <InputFieldComp
          id="keyName"
          v-model="newKey.name"
          label="Name"
          placeholder="My API Key"
          required
          minlength="3"
        />
      </div>
      
      <div class="mt-4 mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
        <div class="space-y-2">
          <CheckboxFieldComp v-model="newKey.permissions.read">Read (GET)</CheckboxFieldComp>
          <CheckboxFieldComp class="ml-4" v-model="newKey.permissions.write">Write (POST/PUT)</CheckboxFieldComp>
          <CheckboxFieldComp class="ml-4" v-model="newKey.permissions.delete">Delete</CheckboxFieldComp>
        </div>
      </div>
      
      <div class="mt-4 mb-4">
        <SelectFieldComp
          id="expiration"
          v-model="expirationOption"
          :options="expirationOptions"
          label="Expiration"
          placeholder="Select expiration"
        />
        
        <InputFieldComp
          v-if="expirationOption === 'custom'"
          type="date"
          v-model="customExpiration"
          :min="minExpirationDate"
          class="mt-2"
        />
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
    <p class="mb-4">
      <span class="inline-block w-full bg-red-50 border-l-4 border-red-400 text-red-800 p-3 rounded">
        <strong class="font-medium">Important:</strong>
        <span class="ml-1">Copy and save your API key now — it will not be displayed again.</span>
      </span>
    </p>
    
    <div class="bg-white border border-gray-200 p-4 rounded-md relative mb-6 shadow-sm" role="status" aria-live="polite">
      <code class="block font-mono text-sm leading-relaxed break-all bg-gray-900 text-white p-2 rounded">{{ newlyCreatedKey?.key || '' }}</code>
      <button 
        @click="copyApiKey" 
        class="absolute top-2 right-2 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="Copy API key"
      >
        Copy
      </button>
    </div>
    
    <h3 class="text-lg font-medium text-gray-900 mb-2">How to use this API key</h3>
    <p class="mb-2 text-sm text-gray-600">Include your API key in requests by using one of these methods:</p>

    <div class="bg-gray-50 border border-gray-200 p-4 rounded-md mb-4 space-y-3">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h4 class="text-sm font-medium text-gray-800">Authorization Header</h4>
          <p class="text-xs text-gray-500">Add to the Authorization header</p>
        </div>
        <div class="flex items-center gap-2">
          <code class="font-mono text-sm bg-gray-900 text-white px-3 py-2 rounded break-all">Authorization: ApiKey {{ newlyCreatedKey?.key || 'YOUR_API_KEY' }}</code>
          <button
            @click="copyText('Authorization: ApiKey ' + (newlyCreatedKey?.key || 'YOUR_API_KEY'))"
            class="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            aria-label="Copy Authorization header"
          >
            Copy
          </button>
        </div>
      </div>

      <div class="flex items-start justify-between gap-4">
        <div>
          <h4 class="text-sm font-medium text-gray-800">X-API-Key Header</h4>
          <p class="text-xs text-gray-500">Add to the X-API-Key header</p>
        </div>
        <div class="flex items-center gap-2">
          <code class="font-mono text-sm bg-gray-900 text-white px-3 py-2 rounded break-all">X-API-Key: {{ newlyCreatedKey?.key || 'YOUR_API_KEY' }}</code>
          <button
            @click="copyText('X-API-Key: ' + (newlyCreatedKey?.key || 'YOUR_API_KEY'))"
            class="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            aria-label="Copy X-API-Key header"
          >
            Copy
          </button>
        </div>
      </div>
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
import SelectFieldComp from '../util/selectFieldComp.vue';
import InputFieldComp from '../util/inputFieldComp.vue';
import CheckboxFieldComp from '../util/checkboxFieldComp.vue';

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
const expirationOptions = [
  { value: '1year', label: '1 Year' },
  { value: '6months', label: '6 Months' },
  { value: '3months', label: '3 Months' },
  { value: '1month', label: '1 Month' },
  { value: 'custom', label: 'Custom Date' }
];

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

const copyText = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert(`Copied to clipboard: ${text}`);
    })
    .catch((err) => {
      console.error('Failed to copy text:', err);
    });
};

const closeNewKeyModal = () => {
  showNewKeyModal.value = false;
  apiKeyStore.clearNewlyCreatedKey();
};
</script>