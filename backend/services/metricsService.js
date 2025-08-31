const os = require('os')
const process = require('process')
const caddyServersRepository = require('../repositories/caddyServersRepository')
const caddyConfigRepository = require('../repositories/caddyConfigRepository')
const auditLogRepository = require('../repositories/auditLogRepository')
const caddyService = require('./caddyService')

// In-memory rolling history for lightweight timeline visualization
const METRICS_HISTORY_MAX = parseInt(process.env.METRICS_HISTORY_MAX, 10) || 120
const metricsHistory = []

/**
 * @typedef {Object} AppMetrics
 * @property {number} pid
 * @property {number} uptimeSeconds
 * @property {string} uptimeHuman
 * @property {Object} memory
 * @property {Object} systemMemory
 * @property {number|null} cpus
 * @property {number[]|null} loadAverage
 * @property {string|null} platform
 * @property {string} nodeVersion
 * @property {Object} versions
 * @property {string|null} env
 * @property {string} hostname
 * @property {Object|null} buildInfo
 */

/**
 * @typedef {Object} ServerMetrics
 * @property {number} total
 * @property {number} online
 * @property {number} offline
 */

/**
 * @typedef {Object} ConfigSummary
 * @property {string|null} id
 * @property {string|null} name
 * @property {string[]} servers
 * @property {string|null} status
 * @property {string[]} hosts
 * @property {string[]} upstreams
 * @property {Object} hostToUpstreams
 */

/**
 * @typedef {Object} ConfigMetrics
 * @property {number} totalConfigs
 * @property {number} totalDomains
 * @property {ConfigSummary[]} configs
 */

/**
 * @typedef {Object} AuditMetrics
 * @property {number|null} total
 */

/**
 * @typedef {Object} MetricsSnapshot
 * @property {string} timestamp
 * @property {AppMetrics} app
 * @property {ServerMetrics} servers
 * @property {ConfigMetrics} configs
 * @property {AuditMetrics} audit
 */

function pushMetricsSnapshot(snapshot) {
  try {
    metricsHistory.push(snapshot)
    // keep only the last N samples
    if (metricsHistory.length > METRICS_HISTORY_MAX) {
      metricsHistory.splice(0, metricsHistory.length - METRICS_HISTORY_MAX)
    }
  } catch (e) {
    // non-fatal; don't break metrics
  }
}

function getMetricsHistory() {
  return metricsHistory.slice()
}

function clearMetricsHistory() {
  metricsHistory.length = 0
}

// Helper: recursively walk an object and collect domain-like strings
function collectDomainsFromObject(obj, out = new Set()) {
  if (!obj) return out
  if (typeof obj === 'string') {
    // find domain-like tokens in the string
    const re = /[a-z0-9-_.]+\.[a-z]{2,}/gi
    const matches = obj.match(re)
    if (matches) matches.forEach(m => out.add(m.toLowerCase()))
    return out
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => collectDomainsFromObject(item, out))
    return out
  }

  if (typeof obj === 'object') {
    Object.values(obj).forEach(v => collectDomainsFromObject(v, out))
  }

  return out
}

async function getAppMetrics() {
  // try to include build-info if available
  let buildInfo = null
  try {
    // prefer a cached require if present
    buildInfo = require('../build-info.json')
  } catch (e) {
    buildInfo = null
  }

  const mem = process.memoryUsage()
  const freeMem = os.freemem()
  const totalMem = os.totalmem()

  return {
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    uptimeHuman: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers
    },
    systemMemory: {
      free: freeMem,
      total: totalMem,
      freePct: totalMem ? Number(((freeMem / totalMem) * 100).toFixed(2)) : null
    },
    cpus: os.cpus() ? os.cpus().length : null,
    loadAverage: os.loadavg ? os.loadavg() : null,
    platform: process.platform,
    nodeVersion: process.version,
    versions: process.versions,
    env: process.env.NODE_ENV || process.env.NODE_ENVIRONMENT || null,
    hostname: os.hostname(),
    buildInfo
  }
}

/**
 * Get app/process metrics
 * @returns {Promise<AppMetrics>} app metrics envelope
 */

async function getServerMetrics() {
  const servers = await caddyServersRepository.findAll({ limit: 10000 })
  const list = Array.isArray(servers) ? servers : []
  const total = list.length
  const online = list.filter(s => s.status === 'online').length
  const offline = list.filter(s => s.status === 'offline').length

  return { total, online, offline }
}

/**
 * Get server inventory metrics
 * @returns {Promise<ServerMetrics>} server metrics
 */

async function getConfigMetrics() {
  const configs = await caddyConfigRepository.findAll({ limit: 10000 })
  const list = Array.isArray(configs) ? configs : []
  const totalConfigs = list.length

  const domainsSet = new Set()
  const perConfig = []

  for (const cfg of list) {
    // try common fields where JSON config might be stored
    const candidates = [cfg.jsonConfig, cfg.json, cfg.config, cfg.body, cfg.data]
    let found = false
    let parsedConfig = null
    for (const c of candidates) {
      if (!c) continue
      if (typeof c === 'string') {
        // try parse as JSON
        try {
          const parsed = JSON.parse(c)
          collectDomainsFromObject(parsed, domainsSet)
          parsedConfig = parsed
          found = true
          break
        } catch (e) {
          // fallback to regex on string
          collectDomainsFromObject(c, domainsSet)
          found = true
          // don't set parsedConfig
          break
        }
      } else if (typeof c === 'object') {
        collectDomainsFromObject(c, domainsSet)
        parsedConfig = c
        found = true
        break
      }
    }

    if (!found) {
      // attempt to examine the entire config object
      collectDomainsFromObject(cfg, domainsSet)
      // also try to parse any JSON-like field into parsedConfig
      for (const c of candidates) {
        if (!c) continue
        if (typeof c === 'string') {
          try { parsedConfig = JSON.parse(c); break } catch (e) { /* ignore */ }
        } else if (typeof c === 'object') {
          parsedConfig = c; break
        }
      }
    }

    // Collect per-config details: hosts and upstream dials
    const configSummary = {
      id: cfg._id || cfg.id || null,
      name: cfg.name || cfg.title || null,
      servers: Array.isArray(cfg.servers) ? cfg.servers : (cfg.server ? [cfg.server] : []),
      status: cfg.status || null,
      hosts: [],
      upstreams: [],
      hostToUpstreams: {}
    }

    try {
      // Prefer using caddyService.extractConfiguredSites when available to get host list
      if (parsedConfig && caddyService && typeof caddyService.extractConfiguredSites === 'function') {
        const sites = caddyService.extractConfiguredSites(parsedConfig) || []
        const hostList = Array.isArray(sites) ? sites.map(s => (typeof s === 'string' ? s : JSON.stringify(s))).filter(Boolean) : []
        hostList.forEach(h => {
          domainsSet.add(h.toLowerCase())
          configSummary.hosts.push(h)
        })
      }

      // Walk parsed config to extract reverse_proxy upstream dials and map them to host matches
      if (parsedConfig && parsedConfig.apps && parsedConfig.apps.http && parsedConfig.apps.http.servers) {
        const serversObj = parsedConfig.apps.http.servers
        for (const [srvName, srvCfg] of Object.entries(serversObj)) {
          const routes = srvCfg.routes || []
          for (const route of routes) {
            // collect host matches
            const matches = route.match || []
            const hosts = []
            matches.forEach(m => {
              if (m.host && Array.isArray(m.host)) hosts.push(...m.host)
            })

            // recursively inspect handle arrays to find reverse_proxy handlers
            function inspectHandles(handles) {
              if (!Array.isArray(handles)) return
              for (const h of handles) {
                if (h.handler === 'reverse_proxy') {
                  const ups = h.upstreams || []
                  ups.forEach(u => {
                    if (u.dial) {
                      const dial = u.dial
                      configSummary.upstreams.push(dial)
                      // map to hosts
                      hosts.forEach(host => {
                        configSummary.hostToUpstreams[host] = configSummary.hostToUpstreams[host] || []
                        configSummary.hostToUpstreams[host].push(dial)
                      })
                    }
                  })
                }
                // nested routes
                if (h.routes && Array.isArray(h.routes)) {
                  h.routes.forEach(nr => {
                    if (nr.handle) inspectHandles(nr.handle)
                  })
                }
              }
            }

            if (route.handle) inspectHandles(route.handle)
            // add hosts to domains set and summary
            hosts.forEach(h => {
              domainsSet.add(h.toLowerCase())
              if (!configSummary.hosts.includes(h)) configSummary.hosts.push(h)
            })
          }
        }
      }
    } catch (e) {
      // non-fatal per-config parsing error
    }

    // dedupe arrays
    configSummary.hosts = Array.from(new Set(configSummary.hosts))
    configSummary.upstreams = Array.from(new Set(configSummary.upstreams))

    perConfig.push(configSummary)
  }

  return { totalConfigs, totalDomains: domainsSet.size, configs: perConfig }
}

/**
 * Get configuration metrics and a compact per-config summary
 * @returns {Promise<ConfigMetrics>} configuration metrics and summaries
 */

async function getAuditMetrics() {
  // Attempt to get a count; repositories may not have a specialized count method
  try {
    const logs = await auditLogRepository.findAll ? await auditLogRepository.findAll({ limit: 10000 }) : []
    const total = Array.isArray(logs) ? logs.length : 0
    return { total }
  } catch (e) {
    return { total: null }
  }
}

/**
 * Get audit/logging metrics (counts)
 * @returns {Promise<AuditMetrics>} audit metrics
 */

async function getAllMetrics() {
  const [app, servers, configs, audit] = await Promise.all([
    getAppMetrics(),
    getServerMetrics(),
    getConfigMetrics(),
    getAuditMetrics()
  ])

  /** @type {MetricsSnapshot} */
  const payload = {
    timestamp: new Date().toISOString(),
    app,
    servers,
    configs,
    audit
  }

  // Push a compact snapshot into the in-memory history for timeline visualization
  try {
    const snap = {
      timestamp: payload.timestamp,
      servers: {
        total: servers?.total ?? null,
        online: servers?.online ?? null,
        offline: servers?.offline ?? null
      },
      configs: {
        total: configs?.totalConfigs ?? null,
        domains: configs?.totalDomains ?? null
      },
      audit: {
        total: audit?.total ?? null
      },
      app: {
        uptimeSeconds: app?.uptimeSeconds ?? null,
        heapUsed: app?.memory?.heapUsed ?? null,
        loadAverage: app?.loadAverage ?? null
      }
    }

    pushMetricsSnapshot(snap)
  } catch (e) {
    // ignore history push failures
  }

  return payload
}

module.exports = {
  getAppMetrics,
  getServerMetrics,
  getConfigMetrics,
  getAuditMetrics,
  getMetricsHistory,
  clearMetricsHistory,
  getAllMetrics
}
