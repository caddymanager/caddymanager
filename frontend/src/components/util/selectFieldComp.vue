<template>
  <div>
    <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        :name="name"
        :disabled="disabled"
        v-model="internalValue"
        :class="computedClasses"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <template v-for="(opt, idx) in options" :key="idx">
          <option v-if="isOptionObject(opt)" :value="opt.value">{{ opt.label }}</option>
          <option v-else :value="opt">{{ opt }}</option>
        </template>
      </select>

      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <ChevronDownIcon class="h-4 w-4 text-gray-500" aria-hidden="true" />
      </span>
    </div>
    <p v-if="help" class="mt-1 text-xs text-gray-500">{{ help }}</p>
  </div>
</template>

<script setup>
import { ChevronDownIcon } from '@heroicons/vue/20/solid';
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Boolean, Object],
  options: { type: Array, default: () => [] },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  help: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  extraClass: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const internalValue = ref(props.modelValue ?? '');

watch(() => props.modelValue, (v) => {
  internalValue.value = v;
});

watch(internalValue, (v) => {
  emit('update:modelValue', v);
});

const baseClasses = 'w-full pr-10 px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-gray-900 placeholder-gray-400 appearance-none sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const computedClasses = computed(() => [baseClasses, props.extraClass].filter(Boolean).join(' '));

function isOptionObject(opt) {
  return opt && typeof opt === 'object' && ('value' in opt || 'label' in opt);
}
</script>
