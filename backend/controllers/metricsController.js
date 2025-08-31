const metricsService = require('../services/metricsService')
const catchAsync = require('../utils/catchAsync')

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Get aggregated metrics
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Aggregated metrics envelope
 */
const getMetrics = catchAsync(async (req, res) => {
  const data = await metricsService.getAllMetrics()
  res.status(200).json({ success: true, data })
})

/**
 * @openapi
 * /metrics/app:
 *   get:
 *     summary: Get application metrics (uptime, memory, load, build)
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: App metrics
 */
const getApp = catchAsync(async (req, res) => {
  const data = await metricsService.getAppMetrics()
  res.status(200).json({ success: true, data })
})

/**
 * @openapi
 * /metrics/servers:
 *   get:
 *     summary: Get server inventory metrics
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Server metrics
 */
const getServers = catchAsync(async (req, res) => {
  const data = await metricsService.getServerMetrics()
  res.status(200).json({ success: true, data })
})

/**
 * @openapi
 * /metrics/configs:
 *   get:
 *     summary: Get configuration metrics (configs, domains)
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Config metrics
 */
const getConfigs = catchAsync(async (req, res) => {
  const data = await metricsService.getConfigMetrics()
  res.status(200).json({ success: true, data })
})

/**
 * @openapi
 * /metrics/history:
 *   get:
 *     summary: Get compact metrics history used for sparklines
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Array of compact metric snapshots
 */
const getHistory = catchAsync(async (req, res) => {
  const data = await metricsService.getMetricsHistory()
  res.status(200).json({ success: true, data })
})

/**
 * @openapi
 * /metrics/history:
 *   delete:
 *     summary: Clear the in-memory metrics history
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Operation result
 */
const clearHistory = catchAsync(async (req, res) => {
  await metricsService.clearMetricsHistory()
  res.status(200).json({ success: true, message: 'metrics history cleared' })
})

/**
 * @openapi
 * /metrics/prometheus:
 *   get:
 *     summary: Prometheus exposition format for key metrics
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Prometheus text format
 */
/**
 * Prometheus exposition endpoint
 *
 * This endpoint returns a plain-text Prometheus exposition containing a curated
 * set of metrics derived from the application's aggregated metrics. The output
 * intentionally keeps most labels low-cardinality (instance, env, version, status)
 * but the endpoint may also emit per-config and per-server metrics which will
 * increase cardinality depending on the number of configs/servers.
 *
 * Supported query parameters:
 *   - detailed=1 : include per-config and per-server metrics (defaults to emitted)
 *     You may want to omit detailed metrics in very large deployments to avoid
 *     high cardinality.
 *
 * Emitted metrics (examples):
 *   - caddymanager_app_info{instance,env,version} 1
 *   - caddymanager_app_uptime_seconds{instance}
 *   - caddymanager_app_load1{instance}
 *   - caddymanager_app_load5{instance}
 *   - caddymanager_app_load15{instance}
 *   - caddymanager_app_memory_heap_used_bytes{instance}
 *   - caddymanager_app_memory_rss_bytes{instance}
 *   - caddymanager_servers_count{status="online|offline|total"}
 *   - caddymanager_server_up{server,id}
 *   - caddymanager_server_last_ping_seconds{server,id}
 *   - caddymanager_configs_total
 *   - caddymanager_configs_total_domains
 *   - caddymanager_config_hosts_total{config}
 *   - caddymanager_config_upstreams_total{config}
 *   - caddymanager_config_host_upstreams_total{config,host}
 *   - caddymanager_audit_total{instance}
 *
 * Notes:
 *  - Label values are escaped for safety.
 *  - Be cautious of cardinality when enabling per-config or per-server metrics.
 *  - If you protect the API with authentication, configure Prometheus to scrape
 *    using the appropriate credentials (basic_auth or bearer_token).
 *
 * @openapi
 * /metrics/prometheus:
 *   get:
 *     summary: Prometheus exposition format for key metrics
 *     tags:
 *       - Metrics
 *     parameters:
 *       - in: query
 *         name: detailed
 *         schema:
 *           type: string
 *         description: If set to '1', include per-config and per-server metrics (may increase cardinality)
 *     responses:
 *       200:
 *         description: Prometheus text format
 */
const getPrometheus = catchAsync(async (req, res) => {
  const data = await metricsService.getAllMetrics()
  // helper to safely add a numeric metric line and label values
  const lines = []
  function escLabel(v) {
    if (v === null || typeof v === 'undefined') return ''
    return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  }

  function addMetric(name, value, labels = {}, help) {
    if (value === null || typeof value === 'undefined' || Number.isNaN(value)) return
    if (help) {
      lines.push(`# HELP ${name} ${help}`)
      lines.push(`# TYPE ${name} gauge`)
    }
    const labelKeys = Object.keys(labels)
    const labelStr = labelKeys.length ? '{' + labelKeys.map(k => `${k}="${escLabel(labels[k])}"`).join(',') + '}' : ''
    lines.push(`${name}${labelStr} ${Number(value)}`)
  }

  // app metrics with info labels
  const instance = data.app?.hostname || 'unknown'
  const env = data.app?.env || process.env.NODE_ENV || 'unknown'
  const version = data.app?.buildInfo?.version || data.app?.buildInfo?.buildNumber || 'local'
  addMetric('caddymanager_app_info', 1, { instance, env, version }, 'Static app info labels (value=1)')
  addMetric('caddymanager_app_uptime_seconds', data.app?.uptimeSeconds, { instance }, 'Process uptime in seconds')
  // prefer 1m load if available
  const load1 = Array.isArray(data.app?.loadAverage) ? data.app.loadAverage[0] : data.app?.loadAverage
  addMetric('caddymanager_app_load1', load1, { instance }, 'System 1m load average')
  addMetric('caddymanager_app_cpus', data.app?.cpus, { instance }, 'Number of CPUs')
  addMetric('caddymanager_app_heap_used_bytes', data.app?.memory?.heapUsed, { instance }, 'Heap used in bytes')

  // server metrics: expose labeled counts by status to avoid proliferating metric names
  addMetric('caddymanager_servers_count', data.servers?.online, { status: 'online' }, 'Number of online servers')
  addMetric('caddymanager_servers_count', data.servers?.offline, { status: 'offline' }, 'Number of offline servers')
  addMetric('caddymanager_servers_count', data.servers?.total, { status: 'total' }, 'Total servers')

  // Per-server metrics (low-cardinality depends on number of servers)
  const serverList = Array.isArray(data.servers?.list) ? data.servers.list : []
  serverList.forEach(s => {
    const sid = s.id || ''
    const sname = s.name || sid || 'unknown'
    const labels = { server: sname, id: sid }
    // up metric: 1 for online, 0 otherwise
    addMetric('caddymanager_server_up', s.status === 'online' ? 1 : 0, labels, 'Server online status (1=up)')
    // last ping as unix seconds (if available)
    const lp = s.lastPinged ? Math.floor(new Date(s.lastPinged).getTime() / 1000) : null
    addMetric('caddymanager_server_last_ping_seconds', lp, labels, 'Last ping timestamp for server (unix seconds)')
  })

  // config metrics
  addMetric('caddymanager_configs_total', data.configs?.totalConfigs, { instance, env }, 'Total configs')
  addMetric('caddymanager_configs_total_domains', data.configs?.totalDomains, { instance, env }, 'Total distinct domains across configs')

  // per-config metrics (hosts/upstreams). Be cautious: this can increase cardinality.
  const configList = Array.isArray(data.configs?.configs) ? data.configs.configs : []
  configList.forEach((cfg, idx) => {
    const cfgId = cfg.id || cfg._id || cfg.name || `cfg_${idx}`
    const cfgLabel = escLabel(cfgId)
    const hosts = Array.isArray(cfg.hosts) ? cfg.hosts : []
    const ups = Array.isArray(cfg.upstreams) ? cfg.upstreams : []
    addMetric('caddymanager_config_hosts_total', hosts.length, { config: cfgLabel }, 'Number of hosts in config')
    addMetric('caddymanager_config_upstreams_total', ups.length, { config: cfgLabel }, 'Number of upstreams in config')
    // per-host upstream counts
    const hostToUp = cfg.hostToUpstreams || {}
    Object.keys(hostToUp).forEach((host) => {
      const upList = Array.isArray(hostToUp[host]) ? hostToUp[host] : []
      addMetric('caddymanager_config_host_upstreams_total', upList.length, { config: cfgLabel, host }, 'Upstream count for host in config')
    })
    // attached servers count (if provided)
    if (Array.isArray(cfg.servers)) {
      addMetric('caddymanager_config_attached_servers_total', cfg.servers.length, { config: cfgLabel }, 'Number of servers attached to this config')
    }
  })

  // audit metrics
  addMetric('caddymanager_audit_total', data.audit?.total, { instance }, 'Total audit log entries (approx)')

  // include additional app metrics: load5/load15 and memory details
  const load5 = Array.isArray(data.app?.loadAverage) ? data.app.loadAverage[1] : null
  const load15 = Array.isArray(data.app?.loadAverage) ? data.app.loadAverage[2] : null
  addMetric('caddymanager_app_load5', load5, { instance }, 'System 5m load average')
  addMetric('caddymanager_app_load15', load15, { instance }, 'System 15m load average')
  addMetric('caddymanager_app_memory_rss_bytes', data.app?.memory?.rss, { instance }, 'Resident set size in bytes')
  addMetric('caddymanager_app_memory_heap_total_bytes', data.app?.memory?.heapTotal, { instance }, 'Heap total in bytes')
  addMetric('caddymanager_app_memory_external_bytes', data.app?.memory?.external, { instance }, 'External memory in bytes')
  addMetric('caddymanager_app_memory_array_buffers_bytes', data.app?.memory?.arrayBuffers, { instance }, 'Array buffer memory in bytes')
  addMetric('caddymanager_app_system_memory_total_bytes', data.app?.systemMemory?.total, { instance }, 'System total memory in bytes')
  addMetric('caddymanager_app_system_memory_free_bytes', data.app?.systemMemory?.free, { instance }, 'System free memory in bytes')
  addMetric('caddymanager_app_system_memory_free_pct', data.app?.systemMemory?.freePct, { instance }, 'System free memory percent')

  const body = lines.join('\n') + '\n'
  res.set('Content-Type', 'text/plain; charset=utf-8')
  res.status(200).send(body)
})

module.exports = {
  getMetrics,
  getApp,
  getServers,
  getConfigs,
  getHistory,
  clearHistory,
  getPrometheus
}
