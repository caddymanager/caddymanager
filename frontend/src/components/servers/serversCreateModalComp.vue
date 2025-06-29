<template>
  <ModalForm
    v-model="showModal"
    title="Add Caddy Server"
    :submit-text="isSubmitting ? 'Processing...' : 'Save Server'"
    :cancel-text="'Cancel'"
    :is-submit-disabled="isSubmitting || !isFormValid"
    @submit="handleSubmit"
    @cancel="resetForm"
    size="lg"
  >
    <div class="flex flex-col gap-4">
      <!-- Form Fields -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Server Name -->
        <div class="flex flex-col mb-2">
          <label for="serverName" class="block text-sm font-medium text-tertiary  mb-1">Server Name*</label>
          <input 
            id="serverName"
            v-model="formData.name"
            type="text"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Production Server"
            maxlength="50"
            @input="validateForm"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</p>
        </div>

        <!-- Server Description -->
        <div class="flex flex-col mb-2">
          <label for="serverDescription" class="block text-sm font-medium text-tertiary mb-1">Description</label>
          <textarea
            id="serverDescription"
            v-model="formData.description"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Main production Caddy server"
            rows="2"
            maxlength="200"
          ></textarea>
        </div>

        <!-- Tags Field -->
        <div class="flex flex-col mb-2 md:col-span-2">
          <label for="serverTags" class="block text-sm font-medium text-tertiary mb-1">Tags</label>
          <input
            id="serverTags"
            v-model="tagsInput"
            type="text"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="production, web, europe (comma-separated)"
          />
          <p class="mt-1 text-xs text-tertiary/70">Enter comma-separated tags to categorize your server.</p>
          <div class="mt-2 flex flex-wrap gap-1">
            <span 
              v-for="(tag, i) in parsedTags" 
              :key="i"
              class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 "
            >
              {{ tag }}
              <button 
                @click="removeTag(i)" 
                type="button" 
                class="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-700 hover:bg-blue-200 hover:text-blue-900 focus:bg-blue-500 focus:text-white focus:outline-none "
              >
                <span class="sr-only">Remove tag</span>
                <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          </div>
        </div>

        <!-- Server URL -->
        <div class="flex flex-col mb-2">
          <label for="serverUrl" class="block text-sm font-medium text-tertiary mb-1">Server Admin API URL*</label>
          <input
            id="serverUrl"
            v-model="formData.apiUrl"
            type="text"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="http://localhost"
            @input="validateForm"
          />
          <p class="mt-1 text-xs text-tertiary/70">The Caddy admin API URL (default: http://localhost)</p>
          <p v-if="errors.apiUrl" class="mt-1 text-xs text-red-600">{{ errors.apiUrl }}</p>
        </div>

        <!-- API Port -->
        <div class="flex flex-col mb-2">
          <label for="apiPort" class="block text-sm font-medium text-tertiary mb-1">API Port*</label>
          <input
            id="apiPort"
            v-model.number="formData.apiPort"
            type="number"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="2019"
            min="1"
            max="65535"
            @input="validateForm"
          />
          <p class="mt-1 text-xs text-tertiary/70">The port for Caddy's admin API (default: 2019)</p>
          <p v-if="errors.apiPort" class="mt-1 text-xs text-red-600">{{ errors.apiPort }}</p>
        </div>

        <!-- Admin API Path -->
        <div class="flex flex-col mb-2">
          <label for="adminApiPath" class="block text-sm font-medium text-tertiary mb-1">Admin API Path</label>
          <input
            id="adminApiPath"
            v-model="formData.adminApiPath"
            type="text"
            class="placeholder:text-gray-300 text-tertiary/70 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="/config/"
          />
          <p class="mt-1 text-xs text-tertiary/70">The API path (default: /config/)</p>
        </div>

        <!-- Additional Options -->
        <div class="md:col-span-2 mt-4">
          <h4 class="text-sm font-medium text-tertiary  mb-3 pb-2 border-b border-gray-200">Additional Options</h4>
          
          <div class="flex items-center mb-4">
            <label class="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="formData.active" 
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary-dark relative inline-flex items-center justify-center"></div>
              <span class="ml-3 text-sm text-tertiary/70">Label server as active</span>
            </label>
          </div>

          <div class="flex items-center mb-4">
            <label class="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="formData.pullExistingConfig" 
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary-dark relative inline-flex items-center justify-center"></div>
              <span class="ml-3 text-sm text-tertiary/70">Pull existing configuration from server</span>
            </label>
            <div class="ml-2">
              <button 
                type="button"
                class="text-sm text-blue-500 hover:text-blue-700  focus:outline-none"
                @click="openHelpTooltip = !openHelpTooltip"
              >
                <QuestionMarkCircleIcon class="h-4 w-4 inline" />
              </button>
              <div v-if="openHelpTooltip" class="absolute bg-white p-2 shadow-lg rounded-md text-xs max-w-xs z-10 mt-1 border border-gray-200">
                This will import the existing Caddy configuration from the server upon creation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModalForm>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useCaddyServersStore } from '@/stores/caddyServersStore';
import ModalForm from '@/components/modals/modalFormComp.vue';
import { useNotification } from "@kyvg/vue3-notification";
import { 
  EyeIcon, 
  EyeSlashIcon,
  QuestionMarkCircleIcon
} from '@heroicons/vue/24/outline';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'server-created', 'server-added']);

// Store access
const caddyServersStore = useCaddyServersStore();
// Notification setup
const { notify } = useNotification();

// Component state
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
const isSubmitting = ref(false);
const showPassword = ref(false);
const showToken = ref(false);
const openHelpTooltip = ref(false);
const tagsInput = ref('');

// Computed for tags handling
const parsedTags = computed(() => {
  if (!tagsInput.value) return [];
  return tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '');
});

// Function to remove a tag
function removeTag(index) {
  const currentTags = [...parsedTags.value];
  currentTags.splice(index, 1);
  tagsInput.value = currentTags.join(', ');
}

// Form data
const formData = reactive({
  name: '',
  description: '',
  apiUrl: 'http://localhost',
  apiPort: 2019,
  adminApiPath: '/config/',
  active: true,
  pullExistingConfig: true
});

// Validation errors
const errors = reactive({
  name: '',
  apiUrl: '',
  apiPort: ''
});

// Computed properties
const isFormValid = computed(() => {
  return formData.name.trim() !== '' && 
         isValidUrl(formData.apiUrl) && 
         formData.apiPort > 0 && formData.apiPort <= 65535;
});

// Methods
function validateForm() {
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '');
  
  // Validate name
  if (formData.name.trim() === '') {
    errors.name = 'Server name is required';
  }
  
  // Validate URL
  if (!isValidUrl(formData.apiUrl)) {
    errors.apiUrl = 'Please enter a valid URL (e.g., http://localhost)';
  }

  // Validate API Port
  if (formData.apiPort <= 0 || formData.apiPort > 65535) {
    errors.apiPort = 'Please enter a valid port number (1-65535)';
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function handleSubmit() {
  validateForm();
  
  if (!isFormValid.value) {
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    // Process tags from the input
    const tags = parsedTags.value;

    const serverData = {
      name: formData.name,
      description: formData.description,
      apiUrl: formData.apiUrl,
      apiPort: formData.apiPort,
      adminApiPath: formData.adminApiPath,
      active: formData.active,
      tags: tags,
      pullExistingConfig: formData.pullExistingConfig
    };
    
    let newServer = await caddyServersStore.addServer(serverData, formData.pullExistingConfig);
    
    if (newServer) {
      resetForm();
      showModal.value = false;
      emit('server-created', newServer);
    } else if (caddyServersStore.error) {
      // Show error notification with the store error message
      notify({
        title: "Error",
        text: caddyServersStore.error,
        type: "error"
      });
    }
  } catch (error) {
    console.error('Failed to save server:', error);
    // Show error notification
    notify({
      title: "Error",
      text: error.message || 'Failed to save server',
      type: "error"
    });
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  // Reset form data
  Object.assign(formData, {
    name: '',
    description: '',
    apiUrl: 'http://localhost',
    apiPort: 2019,
    adminApiPath: '/config/',
    active: true,
    pullExistingConfig: true
  });
  
  // Reset tags input
  tagsInput.value = '';
  
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '');
  
  // Reset state
  showPassword.value = false;
  showToken.value = false;
  openHelpTooltip.value = false;
}

// Watch for modal close to reset form
watch(showModal, (newValue) => {
  if (!newValue) {
    resetForm();
  }
});
</script>