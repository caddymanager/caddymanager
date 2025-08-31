<script setup>
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import BuildInfoComp from '@/components/dashboard/buildInfoComp.vue'
import DashboardPanelNumberComp from '@/components/dashboard/dashboardPanelNumberComp.vue'
import DashboardPanelTextComp from '@/components/dashboard/dashboardPanelTextComp.vue'
import DashboardPanelTimelineComp from '@/components/dashboard/dashboardPanelTimelineComp.vue'
import ModalAuditLogDetailsComp from '@/components/auditlog/modalAuditLogDetailsComp.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuditLogStore } from '@/stores/auditLogStore'
import { useAuthStore } from '@/stores/authStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import apiService from '@/services/apiService'

/**
 * Dashboard view
 *
 * This file provides the data and handlers for the main Dashboard page.
 * Key responsibilities:
 * - fetch initial sets of servers, audit logs and api keys
 * - load aggregated metrics and metrics history for sparklines
 * - expose computed panels consumed by several DashboardPanel* components
 * - handle timeline selection and show audit log detail modal
 */

// prefer metrics and stores for system summary when available
/**
 * Computed list of small key/value items shown in the "System Stats" panel.
 * Prefer aggregated `metrics` when available, otherwise fall back to store values.
 *
 * @returns {Array<{label: string, value: string|number, meta?: string}>}
 */
const textItems = computed(() => {
  const cfgCount = metrics && metrics.value && metrics.value.configs ? metrics.value.configs.totalConfigs : null
  const domainCount = metrics && metrics.value && metrics.value.configs ? metrics.value.configs.totalDomains : null
  const apiKeysCount = (apiKeyStore.apiKeys && Array.isArray(apiKeyStore.apiKeys)) ? apiKeyStore.apiKeys.length : null
  const serversCount = metrics && metrics.value && metrics.value.servers ? metrics.value.servers.total : (serversStore.servers ? serversStore.servers.length : null)

  return [
    { label: 'API Keys', value: apiKeysCount !== null ? apiKeysCount : '—', meta: apiKeyStore.loading ? 'loading…' : '' },
    { label: 'Configs', value: cfgCount !== null ? cfgCount : (domainCount !== null ? domainCount : '—'), meta: domainCount !== null ? `${domainCount} domains` : 'updated recently' },
    { label: 'Caddy Servers', value: serversCount !== null ? serversCount : '—', meta: serversStore.isLoading ? 'loading…' : '' }
  ]
})

// Live-derived panels (replace previous demo panels)
/**
 * Panel summarizing total servers, last delta and sparkline series.
 * Uses aggregated `metrics` when present, otherwise uses the servers store.
 *
 * @returns {{title: string, value: number, delta: number|null, sparklineData: number[]}}
 */
const totalServersPanel = computed(() => {
  const m = metrics && metrics.value && metrics.value.servers ? metrics.value.servers : null
  const servers = serversStore.servers || []
  const total = m ? m.total : servers.length
  const online = m ? m.online : servers.filter(s => s.status === 'online').length
  const prevSeries = serverOnlineSeries.value || []
  const prev = prevSeries.length > 1 ? prevSeries[prevSeries.length - 2] : null
  const last = prevSeries.length ? prevSeries[prevSeries.length - 1] : (typeof online === 'number' ? online : null)
  const delta = (prev !== null && typeof last === 'number' && typeof prev === 'number') ? (last - prev) : null
  return { title: 'Total Servers', value: total, delta, sparklineData: prevSeries }
})

/**
 * Panel summarizing configs (total & delta) with sparkline data from metrics history.
 * Falls back to 'N/A' when no data is available yet.
 *
 * @returns {{title: string, value: number|string, delta: number|null, sparklineData: number[]}}
 */
const configsPanel = computed(() => {
  const m = metrics && metrics.value && metrics.value.configs ? metrics.value.configs : null
  const cfgCount = m ? m.totalConfigs : null
  const ds = domainSeries.value || []
  const last = ds.length ? ds[ds.length - 1] : (cfgCount !== null ? cfgCount : null)
  const prev = ds.length > 1 ? ds[ds.length - 2] : null
  const delta = (prev !== null && typeof last === 'number' && typeof prev === 'number') ? (last - prev) : null
  return { title: 'Configs', value: cfgCount !== null ? cfgCount : (last !== null ? last : 'N/A'), delta, sparklineData: ds }
})

// Use audit log store for recent activity visualization
const auditLogStore = useAuditLogStore()
// Use auth store to gate admin-only panels (matches Audit Log view behavior)
const authStore = useAuthStore()
// API keys store for accurate API key counts
const apiKeyStore = useApiKeyStore()
// Servers store for live server summary
const serversStore = useCaddyServersStore()

// Fetch recent audit logs for the dashboard and initial metrics
/**
 * Initial load for the dashboard: fetch a small set of audit logs, servers and api keys,
 * then attempt to read aggregated metrics and metrics history. Errors are non-fatal
 * and the UI will gracefully fall back to store values.
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    // try to fetch a small recent set; fetchAuditLogs will populate the store.auditLogs
    // Run independent fetches in parallel but don't let one failure stop the others.
    await Promise.allSettled([
      auditLogStore.fetchAuditLogs({ limit: 10 }).catch(err => { console.debug('dashboard: audit logs fetch failed:', err && err.message); }),
      serversStore.fetchServers().catch(err => { console.debug('dashboard: servers fetch failed:', err && err.message); }),
      // fetch a small set of API keys for the dashboard summary (non-blocking)
      apiKeyStore.fetchApiKeys().catch(() => [])
    ])

    // attempt to fetch aggregated metrics (non-blocking)
    try {
      const res = await apiService.get('/metrics')
      metrics.value = res?.data?.data || null
    } catch (e) {
      // metrics are optional for dashboard — UI will fall back to store values
      console.debug('dashboard: metrics fetch failed (continuing):', e && e.message)
    } finally {
      metricsInitialLoaded.value = true
    }

    // attempt to fetch metrics history for sparklines
    try {
      const h = await apiService.get('/metrics/history')
      // backend returns { success: true, data: [ ... ] }
      history.value = h?.data?.data || []
    } catch (e) {
      history.value = []
    }

    // mark initial loads complete so subsequent background refreshes don't show loading UI
    serversInitialLoaded.value = true
    auditInitialLoaded.value = true
  } catch (err) {
    console.error('Failed to load audit logs for dashboard activity', err)
  }
})

// Local initial-loaded flags to avoid showing loading spinners on background refresh
const serversInitialLoaded = ref(false)
const auditInitialLoaded = ref(false)
const metricsInitialLoaded = ref(false)
const metrics = ref(null)
const history = ref([])

// Server summary for dashboard (replaces quick stats demo)
const serverItems = computed(() => {
  // prefer aggregated metrics when available
  const m = metrics && metrics.value && metrics.value.servers ? metrics.value.servers : null

  const servers = serversStore.servers || []
  const total = m ? m.total : servers.length
  const online = m ? m.online : servers.filter(s => s.status === 'online').length
  const offline = m ? m.offline : servers.filter(s => s.status === 'offline').length
  const mostRecent = servers
    .filter(s => s.lastPinged)
    .sort((a, b) => new Date(b.lastPinged) - new Date(a.lastPinged))[0]

  return [
    { label: 'Total Servers', value: total, meta: `${online} online • ${offline} offline` },
    { label: 'Most Recently Pinged', value: mostRecent ? mostRecent.name : '—', meta: mostRecent ? new Date(mostRecent.lastPinged).toLocaleString() : '' },
    { 
      label: 'Online/Offline', 
      value: `${online}/${offline}`,
      htmlValue: `<span class="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold text-green-600"><span class=\"inline-block h-2 w-2 rounded-full bg-green-500 mr-2\"></span>${online}</span><span class=\"mx-2 text-sm text-gray-400\">/</span><span class=\"inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold text-red-600\"><span class=\"inline-block h-2 w-2 rounded-full bg-red-500 mr-2\"></span>${offline}</span>`,
      meta: `${online} online • ${offline} offline` 
    }
  ]
})

// Sparklines from metrics history
const serverOnlineSeries = computed(() => {
  const h = history.value || []
  return h.map(s => (s.servers && typeof s.servers.online === 'number') ? s.servers.online : null).filter(v => v !== null)
})

const domainSeries = computed(() => {
  const h = history.value || []
  return h.map(s => (s.configs && typeof s.configs.domains === 'number') ? s.configs.domains : null).filter(v => v !== null)
})

// CPU load series from metrics history (prefer 1m load if array provided)
const cpuSeries = computed(() => {
  const h = history.value || []
  return h.map(s => {
    const la = s.app && s.app.loadAverage
    if (Array.isArray(la) && la.length) return typeof la[0] === 'number' ? la[0] : null
    if (typeof la === 'number') return la
    return null
  }).filter(v => v !== null)
})

// Small helper panels derived from history (value = latest, delta = latest - previous)
const onlinePanel = computed(() => {
  const s = serverOnlineSeries.value || []
  const last = s.length ? s[s.length - 1] : (metrics && metrics.value && metrics.value.servers ? metrics.value.servers.online : (serversStore.servers || []).filter(x => x.status === 'online').length)
  const prev = s.length > 1 ? s[s.length - 2] : null
  const delta = (prev !== null && typeof last === 'number' && typeof prev === 'number') ? (last - prev) : null
  return { title: 'Online Servers', value: last, delta, sparklineData: s }
})

const domainsPanel = computed(() => {
  const s = domainSeries.value || []
  const last = s.length ? s[s.length - 1] : (metrics && metrics.value && metrics.value.configs ? metrics.value.configs.totalDomains : null)
  const prev = s.length > 1 ? s[s.length - 2] : null
  const delta = (prev !== null && typeof last === 'number' && typeof prev === 'number') ? (last - prev) : null
  return { title: 'Domains', value: last, delta, sparklineData: s }
})

// CPU load panel (value = latest 1m load, delta = diff from previous sample)
const cpuPanel = computed(() => {
  const s = cpuSeries.value || []
  const lastRaw = s.length ? s[s.length - 1] : (metrics && metrics.value && metrics.value.app ? (Array.isArray(metrics.value.app.loadAverage) ? metrics.value.app.loadAverage[0] : metrics.value.app.loadAverage) : null)
  const last = (typeof lastRaw === 'number') ? Number(lastRaw) : null
  const prev = s.length > 1 ? s[s.length - 2] : null
  const delta = (prev !== null && typeof last === 'number' && typeof prev === 'number') ? Number((last - prev)) : null
  // Format sparkline data as numbers (already numbers) and return rounded value for display
  return { title: 'CPU Load (1m)', value: last !== null ? Number(last.toFixed(2)) : 'N/A', delta: delta !== null ? Number(delta.toFixed(2)) : null, sparklineData: s }
})

// App metrics summary (uptime, load, memory, build)
const appItems = computed(() => {
  const a = metrics && metrics.value && metrics.value.app ? metrics.value.app : null
  if (!a) {
    return [
      { label: 'Uptime', value: '—', meta: 'Not available' },
      { label: 'Load (1m)', value: '—', meta: 'Not available' },
      { label: 'Memory (heap)', value: '—', meta: 'Not available' },
      { label: 'Build', value: '—', meta: 'Not available' }
    ]
  }

  const uptime = a.uptimeHuman || (a.uptimeSeconds ? `${Math.floor(a.uptimeSeconds/3600)}h ${Math.floor((a.uptimeSeconds%3600)/60)}m` : '—')
  const load = Array.isArray(a.loadAverage) && a.loadAverage.length ? a.loadAverage[0].toFixed(2) : (a.loadAverage ? String(a.loadAverage) : '—')
  const heapUsed = a.memory && a.memory.heapUsed ? `${Math.round((a.memory.heapUsed / (a.systemMemory?.total || 1)) * 100)}%` : '—'
  const build = a.buildInfo ? (a.buildInfo.version || a.buildInfo.buildNumber || 'local') : 'n/a'

  return [
    { label: 'Uptime', value: uptime, meta: `pid ${a.pid || '—'}` },
    { label: 'Load (1m)', value: load, meta: `cpus: ${a.cpus || '—'}` },
    { label: 'Memory (heap)', value: heapUsed, meta: `${a.memory?.heapUsed ? Math.round(a.memory.heapUsed/1024/1024) + 'MB' : '—'} used` },
    { label: 'Build', value: build, meta: a.nodeVersion || '' }
  ]
})

// Show a small sample list of configs (first 3) with host/upstream counts
const configSamples = computed(() => {
  const cs = metrics && metrics.value && metrics.value.configs && Array.isArray(metrics.value.configs.configs) ? metrics.value.configs.configs : null
  if (!cs || !cs.length) {
    return [ { label: 'Configs', value: '—', meta: 'No details' } ]
  }

  return cs.slice(0, 3).map(c => ({
    label: c.name || (c.id ? `ID:${c.id}` : 'Unnamed'),
    value: (c.hosts && c.hosts.length) ? `${c.hosts.length} hosts` : (c.upstreams && c.upstreams.length ? `${c.upstreams.length} upstreams` : '—'),
    meta: (c.hosts && c.hosts[0]) ? c.hosts[0] : ''
  }))
})

// Update indicator & polling for server status
const isUpdating = ref(false)
const lastUpdated = ref(null)
let updateInterval = null
const now = ref(Date.now())
let nowInterval = null

/**
 * Background update that refreshes servers, server statuses, audit logs and metrics.
 * This is called on an interval and also once immediately after mount.
 *
 * @returns {Promise<void>}
 */
async function doUpdate() {
    try {
      isUpdating.value = true
      // Refresh all dashboard data in parallel but don't let one failure abort the others.
      const settled = await Promise.allSettled([
        serversStore.fetchServers().catch(err => { console.debug('dashboard update: servers fetch failed', err && err.message); return null }),
        serversStore.checkAllServersStatus().catch(err => { console.debug('dashboard update: checkAllServersStatus failed', err && err.message); return null }),
        auditLogStore.fetchAuditLogs({ limit: 10 }).catch(err => { console.debug('dashboard update: audit logs fetch failed', err && err.message); return null }),
        // fetch metrics but don't let it throw the entire update
        apiService.get('/metrics').catch(() => null)
      ])

      // metrics response may be the last settled item
      const metricsSettled = settled[3]
      const maybeMetricsRes = metricsSettled && metricsSettled.status === 'fulfilled' ? metricsSettled.value : null
      if (maybeMetricsRes && maybeMetricsRes.data) {
        metrics.value = maybeMetricsRes.data.data || null
      }

      // refresh history
      try {
        const hres = await apiService.get('/metrics/history')
        // backend returns { success: true, data: [ ... ] }
        history.value = hres?.data?.data || []
      } catch (e) {
        // ignore
      }

    // Notify other components (BuildInfoComp) to refresh if they listen for this event
    try { window.dispatchEvent(new CustomEvent('dashboard:refresh')) } catch (e) { /* no-op */ }

    lastUpdated.value = Date.now()
  } catch (e) {
    console.error('Periodic update failed', e)
  } finally {
    isUpdating.value = false
  }
}

onMounted(() => {
  // start a periodic update every 30s
  // run once immediately to ensure fresh status
  doUpdate()
  updateInterval = setInterval(doUpdate, 30 * 1000)
  // start a 1s tick so time-ago labels update live
  nowInterval = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
  if (nowInterval) clearInterval(nowInterval)
})

/**
 * Return a human-friendly "time ago" string for a timestamp.
 *
 * @param {number|string|Date|null|undefined} ts - timestamp to format (ms since epoch or date string)
 * @returns {string} friendly relative time (e.g. 'just now', '5m ago')
 */
function timeAgo(ts) {
  if (!ts) return 'Never'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return 'Never'
  const s = Math.floor((now.value - lastUpdated.value) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
})

// Map audit logs to the timeline component's expected shape
/**
 * Computed timeline events consumed by `DashboardPanelTimelineComp`.
 * Maps the audit log store objects into a minimal shape: {id,timestamp,title,description,type}.
 * Returns an empty array when there are no logs (component should render an empty state).
 *
 * @returns {Array<{id: string|null, timestamp: number|string|null, title: string, description: string, type: string}>}
 */
const timelineEvents = computed(() => {
  const logs = auditLogStore.auditLogs || []
  const mapped = logs.slice(0, 10).map((log) => {
    const id = log._id || log.id || null
    const timestamp = log.timestamp || log.createdAt || log.created_at || log.date || null
    const title = log.action || log.event || log.type || (log.message ? (typeof log.message === 'string' ? log.message.split('\n')[0] : String(log.message)) : 'Audit event')
    const description = log.description || log.details || log.message || (log.payload ? JSON.stringify(log.payload) : '')
    const type = (log.severity || log.level || 'info').toLowerCase()
    return { id, timestamp, title, description, type }
  })

  // when there are no logs, return empty array (UI will show empty-state)
  return mapped
})

// Modal state for audit log detail
const showAuditModal = ref(false)
const modalAuditLog = ref(null)

/**
 * Handle selection of a timeline event.
 * If the event contains an id, try to reuse the full object from the store or fetch it.
 * Otherwise normalize the provided event and open the modal.
 *
 * @param {Object} ev - event object from the timeline component. May include {id, _id} or be a lightweight object.
 * @returns {Promise<void>}
 */
async function handleSelect(ev) {
  // ev may be an event object with an id, or a demo object
  const id = ev && (ev.id || ev._id || (ev.id === 0 ? ev.id : (ev._id === 0 ? ev._id : null)))

  if (id) {
    // First, try to reuse the full object already stored in the auditLogStore (same path as auditLogTable/auditLogView)
    const existing = (auditLogStore.auditLogs || []).find(l => l._id === id || l.id === id)
    if (existing) {
      modalAuditLog.value = existing
      console.debug('Found full audit log in store, opening modal with:', existing)
      showAuditModal.value = true
      return
    }

    // If not found locally, fetch single audit log from the backend (store helper)
    try {
      const res = await auditLogStore.fetchAuditLog(id)
      // fetchAuditLog may return the raw object, or an envelope like { auditLog: {...} },
      // and the store may also populate currentAuditLog. Mirror auditLogView's preference for the raw object.
      modalAuditLog.value = res?.auditLog || res || auditLogStore.currentAuditLog || normalizeAuditLog(ev)
      console.debug('Fetched audit log for modal:', modalAuditLog.value)
    } catch (err) {
      // fallback to provided event if fetch fails
      console.error('Error fetching audit log for modal:', err)
      modalAuditLog.value = normalizeAuditLog(ev)
    }
  } else {
    // No id -> open modal with the normalized event (may be demo timeline item)
    modalAuditLog.value = normalizeAuditLog(ev)
  }

  // debug payload before opening modal
  console.debug('Opening audit modal with:', modalAuditLog.value)
  showAuditModal.value = true
}

// Ensure modal receives a predictable auditLog shape
/**
 * Normalize different audit log shapes into a predictable object consumed by the details modal.
 * This accepts raw objects, envelopes like {auditLog: {...}}, and previously-normalized items.
 *
 * @param {any} src - source object to normalize
 * @returns {{action:string,statusCode:null|number,timestamp:any,user:any,resourceType:any,resourceId:any,details:any,ipAddress:any,userAgent:any,title:string,description:string,raw:any}}
 */
function normalizeAuditLog(src) {
  if (!src) return {}

  // If src contains an inner data/auditLog, unwrap it
  const data = src.auditLog || src.data || src

  return {
    // action names
    action: data.action || data.event || data.type || data.title || '',
    statusCode: data.statusCode || data.status || data.code || null,
    timestamp: data.timestamp || data.createdAt || data.date || data.time || null,
    // user object
    user: data.user || (data.userId || data.username ? { userId: data.userId, username: data.username } : null),
    resourceType: data.resourceType || data.resource || null,
    resourceId: data.resourceId || data.resource_id || data.id || null,
    details: data.details || data.payload || data.meta || null,
    ipAddress: data.ipAddress || data.ip || null,
    userAgent: data.userAgent || data.ua || null,
    // fallback fields used in timeline items
    title: data.title || data.action || data.event || data.type || '',
    description: data.description || (typeof data.details === 'string' ? data.details : (data.message || '')),
    raw: data
  }
}

/**
 * Load audit logs for a specific user and close the modal.
 *
 * @param {string|number} userId - user identifier
 * @param {string} [username] - optional username (unused, for convenience)
 * @returns {Promise<void>}
 */
async function handleViewUserLogs(userId, username) {
  try {
    await auditLogStore.fetchUserAuditLogs(userId)
    showAuditModal.value = false
    // optional: navigate or show results elsewhere
  } catch (err) {
    console.error('Failed to fetch user audit logs', err)
  }
}

/**
 * Load audit logs for a specific resource and close the modal.
 *
 * @param {string} resourceType - type of resource (e.g. 'config', 'server')
 * @param {string|number} resourceId - resource identifier
 * @returns {Promise<void>}
 */
async function handleViewResourceLogs(resourceType, resourceId) {
  try {
    await auditLogStore.fetchResourceAuditLogs(resourceType, resourceId)
    showAuditModal.value = false
  } catch (err) {
    console.error('Failed to fetch resource audit logs', err)
  }
}
</script>

<template>
  <main>
    <PageTitleComp 
      title="Dashboard" 
      :breadcrumbs="[
        { name: 'Home', path: '/' }
      ]"
    />
    <!-- Subtle global update indicator under the page title -->
    <div class="mt-2">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span v-if="isUpdating" aria-hidden class="inline-flex items-center">
          <svg class="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
        </span>
        <span v-else class="inline-block h-2 w-2 rounded-full bg-transparent" />
        <span class="sr-only">Dashboard data update status</span>
        <span class="text-gray-500">Updated: {{ lastUpdatedText }}</span>
      </div>
    </div>
    <!-- Masonry-like layout using CSS columns; each card must avoid column breaks -->
    <div class="mt-6 columns-1 md:columns-3">
      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelNumberComp
          :title="totalServersPanel.title"
          :value="totalServersPanel.value"
          :delta="totalServersPanel.delta"
          :sparkline-data="totalServersPanel.sparklineData"
          :loading="!metricsInitialLoaded"
        />
      </div>

  <!-- BuildInfo moved out of masonry; it will render full-width below -->

      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelTextComp
          title="Servers Overview"
          :items="serverItems"
          :loading="serversStore.isLoading && !serversInitialLoaded"
        >
          <template #default>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span v-if="isUpdating" aria-hidden class="inline-flex items-center">
                <svg class="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              </span>
            </div>
          </template>
        </DashboardPanelTextComp>
      </div>
      
      <!-- Online servers sparkline panel (uses history) -->
      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelNumberComp
          :title="onlinePanel.title"
          :value="onlinePanel.value"
          :delta="onlinePanel.delta"
          :sparkline-data="onlinePanel.sparklineData"
          :loading="!metricsInitialLoaded"
        />
      </div>

      <!-- Domains sparkline panel (uses history) -->
      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelNumberComp
          :title="domainsPanel.title"
          :value="domainsPanel.value"
          :delta="domainsPanel.delta"
          :sparkline-data="domainsPanel.sparklineData"
          :loading="!metricsInitialLoaded"
        />
      </div>
      
      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelNumberComp
          :title="configsPanel.title"
          :value="configsPanel.value"
          :delta="configsPanel.delta"
          :sparkline-data="configsPanel.sparklineData"
          :loading="!metricsInitialLoaded"
        />
      </div>

      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelTextComp title="System Stats" :items="textItems" />
      </div>

      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelTextComp title="App Health" :items="appItems" :loading="!metricsInitialLoaded" />
      </div>

      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelTextComp title="Config Samples" :items="configSamples" :loading="!metricsInitialLoaded" />
      </div>

      <div class="masonry-item mb-6 inline-block w-full">
        <DashboardPanelNumberComp
          :title="cpuPanel.title"
          :value="cpuPanel.value"
          :delta="cpuPanel.delta"
          :sparkline-data="cpuPanel.sparklineData"
        />
      </div>
      
      <div v-if="authStore.isAdmin" class="masonry-item mb-6 inline-block w-full">
  <DashboardPanelTimelineComp title="Activity" :events="timelineEvents" :loading="auditLogStore.loading && !auditInitialLoaded" @select="handleSelect" />
      </div>
    </div>
    <!-- Full-width BuildInfo panel placed after the masonry area -->
    <div class="mt-6 w-full">
      <BuildInfoComp />
    </div>
    
    <teleport to="body">
      <!-- Only render the modal when we have both the flag and a non-empty payload to avoid
           the modal receiving an empty object (which caused no-data UI previously). -->
      <ModalAuditLogDetailsComp
        v-if="modalAuditLog"
        v-model="showAuditModal"
        :audit-log="modalAuditLog"
        @view-user-logs="handleViewUserLogs"
        @view-resource-logs="handleViewResourceLogs"
      />
    </teleport>
  </main>
</template>

<style scoped>
/* masonry helpers */
.masonry-item { break-inside: avoid; -webkit-column-break-inside: avoid; display: inline-block; width: 100%; }
.columns-1 { column-gap: 1.5rem; }
.columns-2 { column-gap: 1.5rem; }
.columns-3 { column-gap: 1.5rem; }

/* ensure nested cards can shrink gracefully on small screens */
.masonry-item > * { width: 100%; }
</style>