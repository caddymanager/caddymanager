import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Auth routes
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/loginView.vue'),
      meta: { 
        requiresAuth: false,
        title: 'Login'
      }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/profileView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'Profile Settings'
      }
    },
    {
      path: '/apikeys',
      name: 'apikeys',
      component: () => import('@/views/apiKeysView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'API Keys'
      }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/usersListView.vue'),
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: 'User Management'
      }
    },
    {
      path: '/auditlog',
      name: 'auditlog',
      component: () => import('@/views/auditLogView.vue'),
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Audit Log'
      }
    },
    // App routes
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/dashboardView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'Dashboard'
      }
    },
    {
      path: '/servers',
      name: 'servers',
      component: () => import('@/views/serversView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'Servers'
      }
    },
    {
      path: '/servers/:id',
      name: 'serverDetails',
      component: () => import('@/views/serverDetailsView.vue'),
      props: true,
      meta: { 
        requiresAuth: true,
        title: 'Server Details'
      }
    },
    {
      path: '/servers/:id/edit',
      name: 'serverEdit',
      component: () => import('@/views/serverDetailsView.vue'),
      props: route => ({ 
        id: route.params.id, 
        isEditMode: true 
      }),
      meta: { 
        requiresAuth: true,
        title: 'Edit Server'
      }
    },
    {
      path: '/configs',
      name: 'configs',
      component: () => import('@/views/configurationsView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'Configurations'
      }
    },
    {
      path: '/configurations',
      redirect: '/configs',
    },
    {
      path: '/configs/create',
      name: 'createConfig',
      component: () => import('@/views/configurationCreateView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'Create Configuration'
      }
    },
    {
      path: '/configs/:id',
      name: 'configDetails',
      component: () => import('@/views/configurationDetailsView.vue'),
      props: true,
      meta: { 
        requiresAuth: true,
        title: 'Configuration Details'
      }
    },
    {
      path: '/configs/:id/edit',
      name: 'editConfig',
      component: () => import('@/views/configurationDetailsView.vue'),
      props: route => ({ 
        id: route.params.id, 
        isEditMode: true 
      }),
      meta: { 
        requiresAuth: true,
        title: 'Edit Configuration'
      }
    },
    // Catch all route (404)
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // Set page title
  document.title = to.meta.title ? `${to.meta.title} | Caddy Manager` : 'Caddy Manager';
  
  // Check if the route requires authentication
  if (to.meta.requiresAuth !== false) {
    // Get auth store
    const authStore = useAuthStore();
    
    // If not authenticated, redirect to login
    if (!authStore.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } });
      return;
    }
    
    // Check if route requires admin role
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next({ name: 'dashboard' });
      return;
    }
  }
  
  // If authenticated and trying to access login/register pages
  if ((to.name === 'login' || to.name === 'register')) {
    const authStore = useAuthStore();
    
    if (authStore.isAuthenticated) {
      next({ name: 'dashboard' });
      return;
    }
  }
  
  next();
});

export default router
