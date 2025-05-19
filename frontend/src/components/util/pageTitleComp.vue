<script setup>
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

// Props for the component
const props = defineProps({
  // Main page title
  title: {
    type: String,
    required: true
  },
  // Breadcrumb items array
  breadcrumbs: {
    type: Array,
    default: () => []
    // Each breadcrumb should have { name: 'Name', path: '/path' }
  },
  // Primary button (e.g. "Publish")
  primaryButton: {
    type: Object,
    default: null
    // Expected format: { text: 'Button Text', action: Function, disabled: Boolean, icon: 'IconName' }
  },
  // Secondary button (e.g. "Edit")
  secondaryButton: {
    type: Object,
    default: null
    // Expected format: { text: 'Button Text', action: Function, disabled: Boolean }
  },
  // Additional buttons
  additionalButtons: {
    type: Array,
    default: () => []
    // Expected format: Array of { text, action, disabled, variant: 'primary'|'secondary', icon: 'IconName' }
  },
  // View toggle props
  showViewToggle: {
    type: Boolean,
    default: false
  },
  currentView: {
    type: String,
    default: 'cards'
  },
  description: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Icon mapping - maps string names to imported components
const iconComponents = {
  ChevronLeftIcon,
  ChevronRightIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckIcon
}

// Helper function to get the icon component by name
const getIconComponent = (iconName) => {
  return iconName && iconComponents[iconName] ? iconComponents[iconName] : null
}

// Get the primary button icon component
const primaryButtonIcon = computed(() => {
  return props.primaryButton?.icon ? getIconComponent(props.primaryButton.icon) : null
})

const emit = defineEmits(['click-primary', 'click-additional', 'change-view'])

const handlePrimaryClick = () => {
  if (props.primaryButton && props.primaryButton.action) {
    props.primaryButton.action()
  } else {
    emit('click-primary')
  }
}

const handleAdditionalClick = (button, index) => {
  if (button.action) {
    button.action()
  } else {
    emit('click-additional', { button, index })
  }
}

const toggleView = (view) => {
  emit('change-view', view)
}
</script>

<template>
  <div>
    <!-- Back link for mobile view and breadcrumb navigation for desktop -->
    <div>
      <!-- Mobile back link -->
      <nav v-if="breadcrumbs.length > 0" class="sm:hidden" aria-label="Back">
        <RouterLink 
          :to="breadcrumbs[breadcrumbs.length - 1].path" 
          class="flex items-center text-sm font-medium text-gray-500 hover:text-tertiary"
        >
          <ChevronLeftIcon class="mr-1 -ml-1 size-5 shrink-0 text-gray-400" aria-hidden="true" />
          Back
        </RouterLink>
      </nav>
      
      <!-- Desktop breadcrumbs -->
      <nav v-if="breadcrumbs.length > 0" class="hidden sm:flex" aria-label="Breadcrumb">
        <ol role="list" class="flex items-center space-x-4">
          <li v-for="(crumb, index) in breadcrumbs" :key="index">
            <div class="flex items-center" :class="{ 'ml-4': index > 0 }">
              <!-- Separator for all but first item -->
              <ChevronRightIcon 
                v-if="index > 0" 
                class="size-5 shrink-0 text-gray-400 mr-4" 
                aria-hidden="true"
              />
              
              <RouterLink 
                :to="crumb.path" 
                :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
                class="text-sm font-medium text-tertiary hover:text-secondary"
              >
                {{ crumb.name }}
              </RouterLink>
            </div>
          </li>
        </ol>
      </nav>
    </div>
    
    <!-- Title and action buttons -->
    <div class="mt-2 pb-4 md:flex md:items-center md:justify-between">
      <div class="min-w-0 flex-1">
        <h2 class="text-2xl/7 font-bold text-tertiary sm:truncate sm:text-3xl sm:tracking-tight">{{ title }}</h2>
        <div v-if="isLoading" class="mt-1">
          <ArrowPathIcon class="animate-spin h-5 w-5 text-accent-1" aria-hidden="true" />
        </div>
        <p v-if="description" class="mt-1 text-sm text-gray-500">{{ description }}</p>
      </div>
      
      <!-- Action buttons -->
      <div v-if="primaryButton || secondaryButton || additionalButtons.length > 0 || showViewToggle" class="mt-4 flex flex-wrap items-center gap-3 md:mt-0 md:ml-4">
        <!-- View Toggle (when enabled) - Positioned first on mobile but will appear on the left due to flex direction in larger screens -->
        <div v-if="showViewToggle" class="flex border-1 border-accent-2/70 rounded-lg shadow-sm overflow-hidden order-last md:order-first">
          <button
            type="button"
            class="cursor-pointer px-3 py-2 text-sm flex items-center focus:outline-none"
            :class="currentView === 'table' ? 'bg-accent-2 text-secondary font-medium' : 'bg-white text-gray-500 hover:bg-gray-50'"
            @click="toggleView('table')"
          >
            <TableCellsIcon class="h-4 w-4 mr-1" aria-hidden="true" />
            Table
          </button>
          <button
            type="button"
            class="cursor-pointer px-3 py-2 text-sm flex items-center focus:outline-none"
            :class="currentView === 'cards' ? 'bg-accent-2 text-secondary font-medium' : 'bg-white text-gray-500 hover:bg-gray-50'"
            @click="toggleView('cards')"
          >
            <Squares2X2Icon class="h-4 w-4 mr-1" aria-hidden="true" />
            Cards
          </button>
        </div>

        <!-- Additional buttons -->
        <template v-for="(button, index) in additionalButtons" :key="index">
          <button 
            type="button" 
            @click="button.action"
            :disabled="button.disabled"
            :class="[
              'cursor-pointer inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold shadow-xs',
              button.variant === 'primary' 
                ? 'bg-primary text-white hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' 
                : 'bg-white text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
            ]"
          >
            <component 
              v-if="button.icon && getIconComponent(button.icon)" 
              :is="getIconComponent(button.icon)" 
              class="h-4 w-4 mr-1.5" 
              aria-hidden="true" 
            />
            {{ button.text }}
          </button>
        </template>
        
        <!-- Secondary button -->
        <button 
          v-if="secondaryButton" 
          type="button" 
          @click="secondaryButton.action"
          :disabled="secondaryButton.disabled"
          class="cursor-pointer inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon class="mr-1 -ml-1 size-4 shrink-0 text-gray-500" aria-hidden="true" />
          {{ secondaryButton.text }}
        </button>
        
        <!-- Primary button -->
        <button 
          v-if="primaryButton" 
          type="button" 
          @click="primaryButton.action"
          :disabled="primaryButton.disabled"
          class="cursor-pointer inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <component 
            v-if="primaryButtonIcon" 
            :is="primaryButtonIcon" 
            class="h-4 w-4 mr-1.5" 
            aria-hidden="true" 
          />
          {{ primaryButton.text }}
        </button>
      </div>
    </div>
    
    <!-- Action slot for custom actions -->
    <div v-if="$slots.actions" class="mt-4 sm:flex sm:items-center sm:justify-between">
      <div class="mt-4 sm:mt-0">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>