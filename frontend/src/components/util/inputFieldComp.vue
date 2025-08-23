<template>
  <div>
    <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>
    <input
      v-if="!isRadio"
      :id="id"
      :name="name"
      :type="type"
      v-model="internalValue"
      :class="computedClasses"
      v-bind="$attrs"
    />
    <input
      v-else
      :id="id"
      :name="name"
      type="radio"
      :checked="internalValue === value"
      @change="onRadioChange"
      :class="computedClasses"
      v-bind="$attrs"
    />
    <p v-if="help" class="mt-1 text-xs text-gray-500">{{ help }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Boolean, Object],
  // value is the value of the input element (used for radios)
  value: { type: [String, Number, Boolean, Object], default: undefined },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  label: { type: String, default: '' },
  help: { type: String, default: '' },
  type: { type: String, default: 'text' },
  extraClass: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const internalValue = ref(props.modelValue ?? '');

const isRadio = computed(() => props.type === 'radio');

watch(() => props.modelValue, (v) => {
  internalValue.value = v;
});

watch(internalValue, (v) => {
  emit('update:modelValue', v);
});

function onRadioChange() {
  // When the radio is selected, inform parent with the radio's value
  emit('update:modelValue', props.value);
  internalValue.value = props.value;
}

const baseClasses = 'w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-gray-900 placeholder-gray-400 sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const radioBaseClasses = 'h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded-full';
const computedClasses = computed(() => {
  if (isRadio.value) {
    return [radioBaseClasses, props.extraClass].filter(Boolean).join(' ');
  }
  return [baseClasses, props.extraClass].filter(Boolean).join(' ');
});
</script>
