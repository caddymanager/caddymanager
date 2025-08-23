<template>
  <div class="inline-block align-middle">
    <label :for="id" class="inline-flex items-center">
      <input
        :id="id"
        :name="name"
        type="checkbox"
        :disabled="disabled"
        v-model="internalValue"
        :class="computedClasses"
        v-bind="$attrs"
      />
      <span class="ml-2 text-sm text-gray-700"><slot>{{ label }}</slot></span>
    </label>
    <p v-if="help" class="mt-1 text-xs text-gray-500 ml-6">{{ help }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  label: { type: String, default: '' },
  help: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  extraClass: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const internalValue = ref(Boolean(props.modelValue));

watch(() => props.modelValue, (v) => {
  internalValue.value = Boolean(v);
});

watch(internalValue, (v) => {
  emit('update:modelValue', v);
});

const baseClasses = 'h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded focus:outline-none';
const computedClasses = computed(() => [baseClasses, props.extraClass].filter(Boolean).join(' '));
</script>
