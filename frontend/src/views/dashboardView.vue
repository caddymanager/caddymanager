<script setup>
import PageTitleComp from '@/components/util/pageTitleComp.vue'
import BuildInfoComp from '@/components/dashboard/buildInfoComp.vue'
import DashboardPanelNumberComp from '@/components/dashboard/dashboardPanelNumberComp.vue'
import DashboardPanelTextComp from '@/components/dashboard/dashboardPanelTextComp.vue'
import DashboardPanelTimelineComp from '@/components/dashboard/dashboardPanelTimelineComp.vue'
import ModalAuditLogDetailsComp from '@/components/auditlog/modalAuditLogDetailsComp.vue'
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { useAuditLogStore } from '@/stores/auditLogStore'
import { useAuthStore } from '@/stores/authStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import apiService from '@/services/apiService'

// prefer metrics for system summary when available
const textItems = computed(() => {
  const cfgCount = metrics && metrics.value && metrics.value.configs ? metrics.value.configs.totalConfigs : null
  const domainCount = metrics && metrics.value && metrics.value.configs ? metrics.value.configs.totalDomains : null
  return [
    { label: 'API Keys', value: 12, meta: '2 expired' },
    { label: 'Configs', value: cfgCount !== null ? cfgCount : 24, meta: domainCount !== null ? `${domainCount} domains` : 'updated 5m ago' },
    { label: 'Caddy Servers', value: metrics && metrics.value && metrics.value.servers ? metrics.value.servers.total : 3, meta: 'all healthy' }
  ]
})

// Live-derived panels (replace previous demo panels)
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
// Servers store for live server summary
const serversStore = useCaddyServersStore()

// Fetch recent audit logs for the dashboard and initial metrics
onMounted(async () => {
  try {
    // try to fetch a small recent set; fetchAuditLogs will populate the store.auditLogs
    await Promise.all([
      auditLogStore.fetchAuditLogs({ limit: 10 }),
      serversStore.fetchServers()
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
  return [ { label: 'Configs', value: textDemoItems[1].value || '—', meta: 'No details' } ]
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

async function doUpdate() {
  try {
    isUpdating.value = true
    // Refresh all dashboard data: servers list, server statuses and recent audit logs
    const results = await Promise.all([
      serversStore.fetchServers(),
      serversStore.checkAllServersStatus(),
      auditLogStore.fetchAuditLogs({ limit: 10 }),
      // fetch metrics but don't let it throw the entire update
      apiService.get('/metrics').catch(() => null)
    ])

    // metrics response may be last item
    const maybeMetricsRes = results[3]
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

  // fallback demo when store is empty
  if (!mapped.length) {
    return [
      { id: 'demo-1', timestamp: Date.now() - 1000 * 60 * 5, title: 'No recent audit logs', description: 'No recent activities found. Ensure the backend is running and audit logs are available.', type: 'info' }
    ]
  }

  return mapped
})

// Modal state for audit log detail
const showAuditModal = ref(false)
const modalAuditLog = ref(null)

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

async function handleViewUserLogs(userId, username) {
  try {
    await auditLogStore.fetchUserAuditLogs(userId)
    showAuditModal.value = false
    // optional: navigate or show results elsewhere
  } catch (err) {
    console.error('Failed to fetch user audit logs', err)
  }
}

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
              <span class="text-gray-500">Updated: {{ lastUpdatedText }}</span>
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