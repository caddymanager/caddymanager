<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 flex items-center justify-center z-50">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/70" @click="cancelAction"></div>
      
      <!-- Dialog content -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
        <p class="mt-2 text-sm text-gray-500">
          {{ message }}
        </p>
        
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md" v-if="error">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Error
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <pre v-if="isDetailedError" class="whitespace-pre-wrap font-mono text-xs bg-red-100 p-3 rounded border overflow-x-auto max-h-32 overflow-y-auto">{{ error }}</pre>
                <p v-else>{{ error }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-5 flex justify-end gap-3">
          <button 
            type="button" 
            class="cursor-pointer px-3 py-2 text-sm font-medium text-tertiary bg-white hover:bg-gray-50 hover:text-tertiary-dark border border-gray-300 rounded-md shadow-sm"
            @click="cancelAction"
            :disabled="isProcessing"
          >
            {{ cancelText }}
          </button>
          <button 
            type="button" 
            class="cursor-pointer hover:animate-pulse px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md shadow-sm focus:outline-none"
            @click="confirmAction"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing">{{ processingText }}</span>
            <span v-else>{{ confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    required: true
  },
  error: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  processingText: {
    type: String, 
    default: 'Processing...'
  },
  isProcessing: {
    type: Boolean,
    default: false
  },
  dangerous: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

// Computed property to check if error is long/detailed
const isDetailedError = computed(() => {
  return props.error && (props.error.length > 100 || props.error.includes('\n'));
});

// Close modal
const cancelAction = () => {
  if (!props.isProcessing) {
    emit('update:modelValue', false);
    emit('cancel');
  }
};

// Confirm action
const confirmAction = () => {
  if (!props.isProcessing) {
    emit('confirm');
  }
};

// Reset any state when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    // You can reset any internal state here if needed
  }
});
</script>