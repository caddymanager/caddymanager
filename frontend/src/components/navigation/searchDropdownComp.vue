<template>
  <div class="grid flex-1 grid-cols-1">
    <!-- Search input with debounced searching -->
      <input 
        ref="searchInput"
        v-model="searchQuery" 
        type="search" 
        name="search" 
        aria-label="Search" 
        class="col-start-1 row-start-1 block size-full bg-white pl-8 text-base text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6" 
        placeholder="Search"
        @input="debouncedSearch"
        @focus="showDropdown = true"
        @keydown.down.prevent="navigateResults('down')"
        @keydown.up.prevent="navigateResults('up')"
        @keydown.enter.prevent="selectHighlightedResult"
        @keydown.esc.prevent="hideDropdown"
      >
      <MagnifyingGlassIcon class="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400" aria-hidden="true" />
      <button 
        v-if="searchQuery" 
        @click="clearSearch" 
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label="Clear search"
      >
        <XMarkIcon class="size-4" />
      </button>
      <!-- Loading spinner indicator -->
      <div v-if="isSearching" class="absolute right-8 top-1/2 -translate-y-1/2">
        <svg class="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    
    <!-- Results dropdown -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-if="showDropdown && (isSearching || searchResults.length > 0)" 
        class="absolute left-0 right-0 z-50 mt-15 mx-12 mr-62 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-primary focus:outline-hidden max-h-80 overflow-y-auto"
        ref="dropdown"
      >
        <!-- Loading indicator -->
        <div v-if="isSearching && searchResults.length === 0" class="px-4 py-3 text-sm text-gray-500 flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Searching...
        </div>
        
        <!-- No results message -->
        <div v-else-if="searchResults.length === 0 && searchQuery" class="px-4 py-3 text-sm text-gray-500">
          No results found for "<span class="font-medium">{{ searchQuery }}</span>"
        </div>
        
        <!-- Results by type -->
        <template v-else>
          <!-- Server results -->
          <div v-if="groupedResults.server && groupedResults.server.length > 0" class="px-2 mb-2">
            <div class="text-xs font-semibold text-gray-500 px-2 py-1 mt-1">Servers</div>
            <div 
              v-for="(result, index) in groupedResults.server" 
              :key="result.id"
              @click="selectResult(result)"
              @mouseenter="highlightedIndex = getAbsoluteIndex('server', index)"
              :class="[
                'flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer',
                highlightedIndex === getAbsoluteIndex('server', index) ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
              ]"
            >
              <ServerIcon class="mr-2 size-4 flex-shrink-0" :class="highlightedIndex === getAbsoluteIndex('server', index) ? 'text-primary' : 'text-gray-500'" />
              <div>
                <div class="font-medium">{{ result.title }}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">{{ result.description }}</div>
              </div>
              <div class="ml-auto">
                <span 
                  :class="[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', 
                    result.status === 'online' ? 'bg-green-100 text-green-800' : 
                    result.status === 'offline' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ result.status || 'unknown' }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Config results -->
          <div v-if="groupedResults.config && groupedResults.config.length > 0" class="px-2 mb-2">
            <div class="text-xs font-semibold text-gray-500 px-2 py-1 mt-1">Configurations</div>
            <div 
              v-for="(result, index) in groupedResults.config" 
              :key="result.id"
              @click="selectResult(result)"
              @mouseenter="highlightedIndex = getAbsoluteIndex('config', index)"
              :class="[
                'flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer',
                highlightedIndex === getAbsoluteIndex('config', index) ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
              ]"
            >
              <DocumentTextIcon class="mr-2 size-4 flex-shrink-0" :class="highlightedIndex === getAbsoluteIndex('config', index) ? 'text-primary' : 'text-gray-500'" />
              <div>
                <div class="font-medium">{{ result.title }}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">{{ result.description }}</div>
              </div>
            </div>
          </div>
          
          <!-- API results -->
          <div v-if="groupedResults.api && groupedResults.api.length > 0" class="px-2 mb-2">
            <div class="text-xs font-semibold text-gray-500 px-2 py-1 mt-1">API Endpoints</div>
            <div 
              v-for="(result, index) in groupedResults.api" 
              :key="result.id"
              @click="selectResult(result)"
              @mouseenter="highlightedIndex = getAbsoluteIndex('api', index)"
              :class="[
                'flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer',
                highlightedIndex === getAbsoluteIndex('api', index) ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
              ]"
            >
              <CodeBracketIcon class="mr-2 size-4 flex-shrink-0" :class="highlightedIndex === getAbsoluteIndex('api', index) ? 'text-primary' : 'text-gray-500'" />
              <div>
                <div class="font-medium">{{ result.title }}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">{{ result.description }}</div>
              </div>
              <div class="ml-auto">
                <span 
                  :class="[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    result.rawData.method === 'GET' ? 'bg-blue-100 text-blue-800' : 
                    result.rawData.method === 'POST' ? 'bg-green-100 text-green-800' : 
                    result.rawData.method === 'PUT' ? 'bg-amber-100 text-amber-800' : 
                    result.rawData.method === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ result.rawData.method }}
                </span>
              </div>
            </div>
          </div>

          <!-- Result count summary -->
          <div class="border-t border-gray-100 pt-2 pb-1.5 px-3 mt-1">
            <p class="text-xs text-gray-500">
              Found {{ searchResults.length }} results
              <span v-if="searchResults.length >= 15" class="italic">
                (showing top {{ searchResults.length }} matches)
              </span>
            </p>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeMount, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { ServerIcon, DocumentTextIcon, CodeBracketIcon } from '@heroicons/vue/24/outline';
import searchService from '../../services/searchService';

// Props and emits
const props = defineProps({
  maxResults: {
    type: Number,
    default: 10
  }
});

// Local state
const router = useRouter();
const searchQuery = ref('');
const searchResults = ref([]);
const groupedResults = ref({ server: [], config: [], api: [] });
const isSearching = ref(false);
const showDropdown = ref(false);
const searchTimeout = ref(null);
const highlightedIndex = ref(-1);
const searchInput = ref(null);

// Get a flat array of all results for keyboard navigation
const allResults = computed(() => {
  const all = [];
  if (groupedResults.value.server) all.push(...groupedResults.value.server);
  if (groupedResults.value.config) all.push(...groupedResults.value.config);
  if (groupedResults.value.api) all.push(...groupedResults.value.api);
  return all;
});

// Initialize search service
onBeforeMount(async () => {
  try {
    await searchService.initialize();
  } catch (error) {
    console.error('Failed to initialize search service:', error);
  }
});

// Set up click outside handler to close dropdown
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  // Clear any pending timeouts
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
});

// Methods
/**
 * Handle search with debouncing
 */
function debouncedSearch() {
  // Clear previous timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
  
  // Set new timeout
  searchTimeout.value = setTimeout(() => {
    performSearch();
  }, 300); // 300ms debounce
}

/**
 * Perform the actual search
 */
async function performSearch() {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    searchResults.value = [];
    groupedResults.value = { server: [], config: [], api: [] };
    return;
  }
  
  isSearching.value = true;
  
  try {
    // Perform search with a maximum number of results per type
    const results = searchService.search(searchQuery.value, {
      limit: props.maxResults * 3 // Account for 3 types
    });
    
    searchResults.value = results;
    
    // Group the results by type
    groupedResults.value = searchService.groupResultsByType(results);
    
    // Reset highlight
    highlightedIndex.value = -1;
  } catch (error) {
    console.error('Search error:', error);
    searchResults.value = [];
    groupedResults.value = { server: [], config: [], api: [] };
  } finally {
    isSearching.value = false;
  }
}

/**
 * Clear the search
 */
function clearSearch() {
  searchQuery.value = '';
  searchResults.value = [];
  groupedResults.value = { server: [], config: [], api: [] };
  highlightedIndex.value = -1;
  
  // Focus back on search input
  searchInput.value?.focus();
}

/**
 * Handle clicking outside to close dropdown
 */
function handleClickOutside(event) {
  if (searchInput.value && !searchInput.value.contains(event.target)) {
    hideDropdown();
  }
}

/**
 * Hide the dropdown
 */
function hideDropdown() {
  showDropdown.value = false;
  highlightedIndex.value = -1;
}

/**
 * Handle selecting a result
 */
function selectResult(result) {
  searchService.navigateToResult(result, router);
  hideDropdown();
  clearSearch();
}

/**
 * Get absolute index for a result based on type and index within type
 */
function getAbsoluteIndex(type, index) {
  if (type === 'server') {
    return index;
  } else if (type === 'config') {
    return (groupedResults.value.server?.length || 0) + index;
  } else if (type === 'api') {
    return (groupedResults.value.server?.length || 0) +
           (groupedResults.value.config?.length || 0) +
           index;
  }
  return -1;
}

/**
 * Navigate through results using keyboard
 */
function navigateResults(direction) {
  if (!showDropdown.value || allResults.value.length === 0) return;
  
  if (direction === 'down') {
    if (highlightedIndex.value < allResults.value.length - 1) {
      highlightedIndex.value++;
    } else {
      // Loop back to the beginning
      highlightedIndex.value = 0;
    }
  } else if (direction === 'up') {
    if (highlightedIndex.value > 0) {
      highlightedIndex.value--;
    } else {
      // Loop to the end
      highlightedIndex.value = allResults.value.length - 1;
    }
  }
}

/**
 * Select the currently highlighted result
 */
function selectHighlightedResult() {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < allResults.value.length) {
    selectResult(allResults.value[highlightedIndex.value]);
  }
}

// Watch for query changes
watch(searchQuery, (newQuery) => {
  if (!newQuery || newQuery.trim() === '') {
    searchResults.value = [];
    groupedResults.value = { server: [], config: [], api: [] };
  }
});
</script>

<style scoped>
.outline-hidden {
  outline: none;
}

.outline-hidden:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

/* Ensure search results are styled properly */
.max-h-80 {
  max-height: 20rem;
  scrollbar-width: thin;
}

.max-h-80::-webkit-scrollbar {
  width: 6px;
}

.max-h-80::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.max-h-80::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.max-h-80::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>