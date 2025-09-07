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
 * @property {Array<Object>} list - normalized server summaries (id,name,status,lastPinged,address)
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
    // Validate snapshot has required structure
    if (!snapshot || !snapshot.timestamp) {
      console.warn('Invalid metrics snapshot - missing timestamp');
      return;
    }

    // Ensure numeric values are actually numbers and not NaN
    const cleanSnapshot = {
      timestamp: snapshot.timestamp,
      servers: {
        total: isValidNumber(snapshot.servers?.total) ? snapshot.servers.total : 0,
        online: isValidNumber(snapshot.servers?.online) ? snapshot.servers.online : 0,
        offline: isValidNumber(snapshot.servers?.offline) ? snapshot.servers.offline : 0
      },
      configs: {
        total: isValidNumber(snapshot.configs?.total) ? snapshot.configs.total : 0,
        domains: isValidNumber(snapshot.configs?.domains) ? snapshot.configs.domains : 0
      },
      audit: {
        total: isValidNumber(snapshot.audit?.total) ? snapshot.audit.total : 0
      },
      app: {
        uptimeSeconds: isValidNumber(snapshot.app?.uptimeSeconds) ? snapshot.app.uptimeSeconds : 0,
        heapUsed: isValidNumber(snapshot.app?.heapUsed) ? snapshot.app.heapUsed : 0,
        heapTotal: isValidNumber(snapshot.app?.heapTotal) ? snapshot.app.heapTotal : 0,
        rss: isValidNumber(snapshot.app?.rss) ? snapshot.app.rss : 0,
        loadAverage: Array.isArray(snapshot.app?.loadAverage) ? 
          snapshot.app.loadAverage.filter(v => isValidNumber(v)) : 
          (isValidNumber(snapshot.app?.loadAverage) ? [snapshot.app.loadAverage] : []),
        cpus: isValidNumber(snapshot.app?.cpus) ? snapshot.app.cpus : null,
        freeMem: isValidNumber(snapshot.app?.freeMem) ? snapshot.app.freeMem : 0,
        totalMem: isValidNumber(snapshot.app?.totalMem) ? snapshot.app.totalMem : 0
      }
    };

    metricsHistory.push(cleanSnapshot);
    
    // keep only the last N samples
    if (metricsHistory.length > METRICS_HISTORY_MAX) {
      metricsHistory.splice(0, metricsHistory.length - METRICS_HISTORY_MAX);
    }
  } catch (e) {
    console.warn('Failed to push metrics snapshot:', e.message);
    // non-fatal; don't break metrics
  }
}

// Helper function to validate numbers
function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function getMetricsHistory(options = {}) {
  try {
    const { limit, fields } = options;
    let history = metricsHistory.slice();

    // Apply limit if specified
    if (limit && typeof limit === 'number' && limit > 0) {
      history = history.slice(-limit);
    }

    // Filter fields if specified
    if (fields && Array.isArray(fields) && fields.length > 0) {
      history = history.map(snapshot => {
        const filtered = { timestamp: snapshot.timestamp };
        fields.forEach(field => {
          if (snapshot[field]) {
            filtered[field] = snapshot[field];
          }
        });
        return filtered;
      });
    }

    return history;
  } catch (e) {
    console.warn('Failed to get metrics history:', e.message);
    return [];
  }
}

function getMetricsHistorySeries(metric) {
  try {
    const history = metricsHistory.slice();
    
    switch (metric) {
      case 'servers.online':
        return history.map(s => s.servers?.online).filter(v => isValidNumber(v));
      case 'servers.total':
        return history.map(s => s.servers?.total).filter(v => isValidNumber(v));
      case 'configs.total':
        return history.map(s => s.configs?.total).filter(v => isValidNumber(v));
      case 'configs.domains':
        return history.map(s => s.configs?.domains).filter(v => isValidNumber(v));
      case 'app.heapUsed':
        return history.map(s => s.app?.heapUsed).filter(v => isValidNumber(v));
      case 'app.loadAverage':
        return history.map(s => {
          const la = s.app?.loadAverage;
          if (Array.isArray(la) && la.length > 0) {
            return isValidNumber(la[0]) ? la[0] : null;
          }
          return isValidNumber(la) ? la : null;
        }).filter(v => v !== null);
      case 'app.memoryUsagePercent':
        return history.map(s => {
          const used = s.app?.heapUsed;
          const total = s.app?.totalMem;
          if (isValidNumber(used) && isValidNumber(total) && total > 0) {
            return (used / total) * 100;
          }
          return null;
        }).filter(v => v !== null);
      default:
        return [];
    }
  } catch (e) {
    console.warn(`Failed to get metrics series for ${metric}:`, e.message);
    return [];
  }
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
  const rawList = Array.isArray(servers) ? servers : []
  const total = rawList.length
  const online = rawList.filter(s => s.status === 'online').length
  const offline = rawList.filter(s => s.status === 'offline').length

  // Normalize a compact server summary to include safe fields for metrics labeling
  const list = rawList.map(s => ({
    id: s._id || s.id || null,
    name: s.name || s.hostname || s.host || null,
    status: s.status || null,
    lastPinged: s.lastPinged || s.last_pinged || s.last_ping || s.updatedAt || s.updated_at || null,
    address: s.address || s.host || null
  }))

  return { total, online, offline, list }
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
        total: servers?.total ?? 0,
        online: servers?.online ?? 0,
        offline: servers?.offline ?? 0
      },
      configs: {
        total: configs?.totalConfigs ?? 0,
        domains: configs?.totalDomains ?? 0
      },
      audit: {
        total: audit?.total ?? 0
      },
      app: {
        uptimeSeconds: app?.uptimeSeconds ?? 0,
        heapUsed: app?.memory?.heapUsed ?? 0,
        heapTotal: app?.memory?.heapTotal ?? 0,
        rss: app?.memory?.rss ?? 0,
        loadAverage: app?.loadAverage ?? [],
        cpus: app?.cpus ?? null,
        freeMem: app?.systemMemory?.free ?? 0,
        totalMem: app?.systemMemory?.total ?? 0
      }
    };

    pushMetricsSnapshot(snap);
  } catch (e) {
    console.warn('Failed to create metrics snapshot:', e.message);
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
  getMetricsHistorySeries,
  clearMetricsHistory,
  getAllMetrics
}
