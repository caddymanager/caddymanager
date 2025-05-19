<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" @click.self="closeModal">
        <div class="bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden" :class="[sizeClass]" :aria-label="title">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-tertiary">{{ title }}</h3>
            <button
              type="button"
              class="text-tertiary hover:text-primary focus:outline-none"
              @click="closeModal"
              aria-label="Close modal"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-4 overflow-y-auto flex-grow text-gray-300">
            <slot></slot>
          </div>

          <!-- Modal Footer -->
          <div v-if="$slots.footer" class="flex justify-end gap-3 p-4 border-t border-gray-200">
            <slot name="footer"></slot>
          </div>
          <div v-else-if="showDefaultFooter" class="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button
              type="button"
              class="cursor-pointer px-4 py-2 bg-tertiary text-white rounded hover:bg-tertiary/70 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              @click="closeModal"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              class="cursor-pointer px-4 py-2 bg-primary text-black rounded hover:bg-primary-dark hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="confirmModal"
              :disabled="isSubmitDisabled"
            >
              {{ submitText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: 'Modal Title'
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  showDefaultFooter: {
    type: Boolean,
    default: true
  },
  submitText: {
    type: String,
    default: 'Submit'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  isSubmitDisabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'serverAdded']);

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-full max-w-md';
    case 'lg': return 'w-full max-w-xl';
    case 'xl': return 'w-full max-w-3xl';
    case 'full': return 'w-full max-w-5xl';
    default: return 'w-full max-w-lg';
  }
});

const closeModal = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const confirmModal = () => {
  emit('submit');
};
</script>

<style scoped>
/* Transition effects */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>