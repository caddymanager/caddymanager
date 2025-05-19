<template>
  <div class="flex flex-col items-center justify-center">
    <!-- Loading spinner with dynamic styling based on color prop -->
    <div 
      class="loading-spinner inline-block mb-4"
      :class="{ 
        'white-spinner': color === 'white', 
        'gradient-spinner': color === 'gradient',
        'h-16 w-16': size === 'large',
        'h-12 w-12': size === 'medium',
        'h-8 w-8': size === 'small'
      }"
    ></div>
    
    <!-- Optional caption text -->
    <p v-if="caption" class="text-sm" :class="textColorClass">{{ caption }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  caption: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'white',
    validator: (value) => ['white', 'gradient'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  textColor: {
    type: String,
    default: '', // Empty means automatic based on spinner color
  }
});

// Dynamic text color based on spinner color if not explicitly set
const textColorClass = computed(() => {
  if (props.textColor) {
    return props.textColor;
  }
  
  return props.color === 'white' 
    ? 'text-gray-200 ' 
    : 'text-tertiary ';
});
</script>

<style scoped>
.loading-spinner {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.white-spinner {
  border-top: 4px solid white;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

.gradient-spinner {
  border-top: 4px solid transparent;
  background: linear-gradient(135deg, #1e40af, #1e3a8a, #7f1d1d, #991b1b);
  background-size: 400% 400%;
  animation: spin 1s linear infinite, gradient-animation 10s ease infinite;
  box-shadow: 0 0 15px rgba(30, 64, 175, 0.5);
  position: relative;
}

.gradient-spinner::before {
  content: "";
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 50%;
  border: 4px solid transparent;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes gradient-animation {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>