<template>
  <div>
    <PageTitleComp 
      title="API Keys"
      :breadcrumbs="[
        { name: 'Home', path: '/' },
        { name: 'API Keys', path: '/apikeys' }
      ]"
      :primaryButton="{
        text: 'Create API Key', 
        action: () => showCreateKeyModal = true,
        icon: 'PlusIcon'
      }"
    />

    <p class="text-gray-600 mb-6">
      API Keys allow you to interact with the CaddyManager API programmatically.
      These tokens can be used for machine-to-machine communication without requiring user authentication.
    </p>
    
    <!-- API Documentation Tab Section -->
    <div class="mb-6">
      <div class="flex border-b border-gray-200">
        <button 
          :class="[
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px',
            activeTab === 'keys' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]" 
          @click="activeTab = 'keys'"
        >
          Manage API Keys
        </button>
        <button 
          :class="[
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px',
            activeTab === 'docs' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]" 
          @click="activeTab = 'docs'"
        >
          API Documentation
        </button>
      </div>
    </div>
    
    <!-- API Keys Management Tab -->
    <div v-if="activeTab === 'keys'">
      <ApiKeyListComp 
        :apiKeys="apiKeyStore.apiKeys"
        :loading="apiKeyStore.loading"
        :error="apiKeyStore.error"
        @edit="editKey"
        @delete="confirmDeleteKey"
      />
    </div>
    
    <!-- API Documentation Tab -->
    <div v-if="activeTab === 'docs'">
      <ApiDocsComp :apiBaseUrl="apiBaseUrl" ref="apiDocsComponent" />
    </div>
    
    <!-- Modals -->
    <ModalCreateApiKeyComp
      v-model="showCreateKeyModal"
      @key-created="fetchApiKeys"
    />
    
    <ModalEditApiKeyComp
      v-model="showEditKeyModal"
      :apiKey="keyToEdit"
      @key-updated="fetchApiKeys"
    />
    
    <!-- Confirm Delete Modal -->
    <ModalConfirmComp
      v-model="showDeleteConfirm"
      title="Confirm Deletion"
      message="Are you sure you want to delete this API key? This action cannot be undone."
      :isProcessing="apiKeyStore.loading"
      @confirm="deleteApiKey"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useApiKeyStore } from '../stores/apiKeyStore';
import PageTitleComp from '../components/util/pageTitleComp.vue';
import ApiDocsComp from '../components/apikeys/apiDocsComp.vue';
import ApiKeyListComp from '../components/apikeys/apiKeyListComp.vue';
import ModalCreateApiKeyComp from '../components/apikeys/modalCreateApiKeyComp.vue';
import ModalEditApiKeyComp from '../components/apikeys/modalEditApiKeyComp.vue';
import ModalConfirmComp from '../components/modals/modalConfirmComp.vue';
import config from '../services/configService';

// Store
const apiKeyStore = useApiKeyStore();

// Reactive state
const activeTab = ref('keys');
const apiBaseUrl = ref(config.API.BASE_URL);
const showCreateKeyModal = ref(false);
const showEditKeyModal = ref(false);
const keyToEdit = ref(null);
const showDeleteConfirm = ref(false);
const keyToDeleteId = ref(null);
const apiDocsComponent = ref(null);

// Watch for tab changes to load documentation
watch(activeTab, (newTab) => {
  if (newTab === 'docs' && apiDocsComponent.value) {
    apiDocsComponent.value.fetchApiDocs();
  }
});

// Methods
const fetchApiKeys = async () => {
  try {
    await apiKeyStore.fetchApiKeys();
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
  }
};

const editKey = (key) => {
  keyToEdit.value = key;
  showEditKeyModal.value = true;
};

const confirmDeleteKey = (id) => {
  keyToDeleteId.value = id;
  showDeleteConfirm.value = true;
};

const deleteApiKey = async () => {
  try {
    await apiKeyStore.deleteApiKey(keyToDeleteId.value);
    showDeleteConfirm.value = false;
  } catch (error) {
    console.error('Failed to delete API key:', error);
  }
};

// Lifecycle hooks
onMounted(() => {
  fetchApiKeys();
});
</script>