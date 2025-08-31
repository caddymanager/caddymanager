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

module.exports = {
  getMetrics,
  getApp,
  getServers,
  getConfigs
  , getHistory, clearHistory
}
