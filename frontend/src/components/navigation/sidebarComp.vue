<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { 
  HomeIcon, 
  ServerIcon, 
  DocumentTextIcon,
  GlobeAltIcon, 
  DocumentChartBarIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
  KeyIcon,
  UsersIcon
} from '@heroicons/vue/24/outline'
import SearchDropdownComp from './searchDropdownComp.vue'
import searchService from '../../services/searchService'

// Get current route to determine active navigation item
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State for mobile sidebar visibility
const isMobileMenuOpen = ref(false)

// Toggle mobile sidebar visibility
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// Profile dropdown state
const isProfileMenuOpen = ref(false)

// Toggle profile dropdown
const toggleProfileMenu = () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value
}

// Handle logout action
const handleLogout = () => {
  authStore.logout()
  isProfileMenuOpen.value = false
  router.push('/login')
}

// Navigation items with computed current property
const navigationItems = computed(() => {
  const items = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: HomeIcon, 
      current: route.path === '/' 
    },
    { 
      name: 'Servers', 
      href: '/servers', 
      icon: ServerIcon, 
      current: route.path.startsWith('/servers')
    },
    { 
      name: 'Configurations', 
      href: '/configs', 
      icon: DocumentTextIcon, 
      current: route.path.startsWith('/configs')
    },
    { 
      name: 'API Keys', 
      href: '/apikeys', 
      icon: KeyIcon, 
      current: route.path.startsWith('/apikeys')
    }
  ]
  
  if (authStore.isAdmin) {
    items.push({
      name: 'User Management',
      href: '/users',
      icon: UsersIcon,
      current: route.path.startsWith('/users')
    },
    {
      name: 'Audit Logs',
      href: '/auditlog',
      icon: DocumentChartBarIcon,
      current: route.path.startsWith('/auditlog')
    })
  }
  
  return items
})

// Utilities section
const utilityNavigation = computed(() => [
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Cog6ToothIcon,
    current: route.path.startsWith('/settings')
  }
])

// Computed property to get display name
const displayName = computed(() => {
  return authStore.user ? authStore.username : 'User'
})

// Computed property to check if user is admin
const isAdmin = computed(() => {
  return authStore.isAdmin
})

// Initialize search service when component is mounted
onMounted(async () => {
  try {
    await searchService.initialize()
  } catch (error) {
    console.error('Failed to initialize search service:', error)
  }
})
</script>

<template>
  <div>
    <!-- Off-canvas menu for mobile, show/hide based on off-canvas menu state. -->
    <div class="relative z-50 lg:hidden" role="dialog" aria-modal="true" v-if="isMobileMenuOpen">
      <!-- Backdrop overlay -->
      <div class="fixed inset-0 bg-gray-900/80" aria-hidden="true" @click="toggleMobileMenu"></div>

      <div class="fixed inset-0 flex">
        <!-- Mobile sidebar -->
        <div class="relative mr-16 flex w-full max-w-xs flex-1">
          <!-- Close button -->
          <div class="absolute top-0 left-full flex w-16 justify-center pt-5">
            <button type="button" class="-m-2.5 p-2.5" @click="toggleMobileMenu">
              <span class="sr-only">Close sidebar</span>
              <XMarkIcon class="size-6 text-white" aria-hidden="true" />
            </button>
          </div>

          <!-- Sidebar component for mobile -->
          <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-6 pb-4">
            <div class="flex h-16 shrink-0 items-center">
              <span class="text-xl font-bold text-black">Caddy Manager</span>
            </div>
            <nav class="flex flex-1 flex-col">
              <ul role="list" class="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" class="-mx-2 space-y-1">
                    <li v-for="item in navigationItems" :key="item.name">
                      <RouterLink
                        :to="item.href"
                        :class="[
                          item.current ? 'bg-primary-dark text-black' : 'text-black hover:text-black hover:bg-primary-dark',
                          'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                        ]"
                      >
                        <component 
                          :is="item.icon" 
                          class="size-6 shrink-0" 
                          :class="item.current ? 'text-black' : 'text-black group-hover:text-black'"
                          aria-hidden="true"
                        />
                        {{ item.name }}
                      </RouterLink>
                    </li>
                  </ul>
                </li>
                <li class="mt-auto">
                  <RouterLink
                    v-for="item in utilityNavigation"
                    :key="item.name"
                    :to="item.href"
                    :class="[
                      item.current ? 'bg-primary-dark text-black' : 'text-black hover:text-black hover:bg-primary-dark',
                      'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                    ]"
                  >
                    <component
                      :is="item.icon"
                      class="size-6 shrink-0"
                      :class="item.current ? 'text-black' : 'text-black group-hover:text-black'"
                      aria-hidden="true"
                    />
                    {{ item.name }}
                  </RouterLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Static sidebar for desktop -->
    <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <!-- Sidebar component for desktop -->
      <div class="flex grow flex-col gap-y-5 overflow-y-auto breathing-background-gentle px-6 pb-4">
        <div class="flex h-16 shrink-0 items-center">
          <span class="text-xl font-bold text-white">Caddy Manager</span>
        </div>
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-1">
                <li v-for="item in navigationItems" :key="item.name">
                  <RouterLink
                    :to="item.href"
                    :class="[
                      item.current ? 'bg-primary/70 text-white hover:bg-primary' : 'text-gray-200 hover:text-white hover:bg-primary',
                      'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                    ]"
                  >
                    <component 
                      :is="item.icon" 
                      class="size-6 shrink-0" 
                      :class="item.current ? 'text-white' : 'text-white group-hover:text-white'"
                      aria-hidden="true"
                    />
                    {{ item.name }}
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li class="mt-auto">
              <RouterLink
                v-for="item in utilityNavigation"
                :key="item.name"
                :to="item.href"
                :class="[
                  item.current ? 'bg-primary/70 text-white hover:bg-primary' : 'text-gray-300 hover:text-white hover:bg-primary',
                  'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                ]"
              >
                <component 
                  :is="item.icon" 
                  class="size-6 shrink-0" 
                  :class="item.current ? 'text-white' : 'text-gray-300 group-hover:text-white'"
                  aria-hidden="true"
                />
                {{ item.name }}
              </RouterLink>
              <!-- GitHub link below settings -->
              <a
                href="https://github.com/caddymanager/caddymanager"
                target="_blank"
                rel="noopener noreferrer"
                class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-300 hover:text-white hover:bg-primary mt-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 shrink-0">
                  <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.919.678 1.852 0 1.336-.012 2.417-.012 2.747 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/>
                </svg>
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Top navigation bar -->
    <div class="lg:pl-72">
      <div class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
        <!-- Mobile menu button -->
        <button type="button" class="-m-2.5 p-2.5 text-tertiary lg:hidden" @click="toggleMobileMenu">
          <span class="sr-only">Open sidebar</span>
          <Bars3Icon class="size-6" aria-hidden="true" />
        </button>

        <!-- Separator -->
        <div class="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true"></div>

        <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <!-- Search -->
            <SearchDropdownComp :maxResults="5" class="" />
          
          <!-- Right section with notifications and profile -->
          <div class="flex items-center gap-x-4 lg:gap-x-6">

            <!-- Separator -->
            <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true"></div>

            <!-- Profile dropdown -->
            <div class="relative">
              <button 
                type="button" 
                class="-m-1.5 flex items-center p-1.5" 
                id="user-menu-button" 
                @click="toggleProfileMenu"
                aria-expanded="isProfileMenuOpen"
                aria-haspopup="true"
              >
                <span class="sr-only">Open user menu</span>
                <UserCircleIcon class="size-8 rounded-full bg-gray-50" />
                <span class="hidden lg:flex lg:items-center">
                  <span class="ml-4 text-sm/6 font-semibold text-gray-900" aria-hidden="true">
                    {{ displayName }}
                    <span v-if="isAdmin" class="ml-1 text-xs text-primary">(Admin)</span>
                  </span>
                  <ChevronDownIcon class="ml-2 size-5 text-gray-400" aria-hidden="true" />
                </span>
              </button>

              <!-- Dropdown menu -->
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div 
                  v-if="isProfileMenuOpen"
                  class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-hidden" 
                  role="menu" 
                  aria-orientation="vertical" 
                  aria-labelledby="user-menu-button" 
                  tabindex="-1"
                >
                  <RouterLink to="/profile" class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" role="menuitem" tabindex="-1" id="user-menu-item-0">Your profile</RouterLink>
                  <button @click="handleLogout" class="block w-full text-left px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50" role="menuitem" tabindex="-1" id="user-menu-item-1">Logout</button>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <main class="py-6">
        <div class="px-6">
          <!-- Main content wrapper - router view will be rendered in App.vue -->
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>