import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Notifications from '@kyvg/vue3-notification'

import App from './App.vue'
import router from './router'
import config from './services/configService'

// Create Pinia store
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Create and configure Vue app
const app = createApp(App)

// Register plugins
app.use(pinia)
app.use(router)
app.use(Notifications)

// Global error handler
app.config.errorHandler = (error, vm, info) => {
  console.error('Vue Error:', error)
  console.error('Component:', vm)
  console.error('Info:', info)
}

// Mount the app
app.mount('#app')

console.log(`${config.APP.TITLE} app created and mounted`)
