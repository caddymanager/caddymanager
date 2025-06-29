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
        
        <div class="mt-4 text-red-600 text-sm" v-if="error">
          {{ error }}
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
import { watch } from 'vue';

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