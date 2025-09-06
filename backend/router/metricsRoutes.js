const express = require('express')
const router = express.Router()
const metricsController = require('../controllers/metricsController')

/**
 * @openapi
 * tags:
 *   - name: Metrics
 *     description: Application and system metrics endpoints
 */

/**
 * @openapi
 * /api/v1/metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Get aggregated metrics (app, servers, configs, audit)
 *     responses:
 *       200:
 *         description: Aggregated metrics envelope
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/', metricsController.getMetrics)

/**
 * @openapi
 * /api/v1/metrics/app:
 *   get:
 *     tags: [Metrics]
 *     summary: Get application-level metrics (uptime, memory, load, build)
 *     responses:
 *       200:
 *         description: App metrics
 */
router.get('/app', metricsController.getApp)

/**
 * @openapi
 * /api/v1/metrics/servers:
 *   get:
 *     tags: [Metrics]
 *     summary: Get server inventory metrics (total/online/offline)
 *     responses:
 *       200:
 *         description: Server metrics
 */
router.get('/servers', metricsController.getServers)

/**
 * @openapi
 * /api/v1/metrics/configs:
 *   get:
 *     tags: [Metrics]
 *     summary: Get configuration metrics (total configs, domains, samples)
 *     responses:
 *       200:
 *         description: Config metrics
 */
router.get('/configs', metricsController.getConfigs)

/**
 * @openapi
 * /api/v1/metrics/history:
 *   get:
 *     tags: [Metrics]
 *     summary: Get recent metrics history used for sparklines and timelines
 *     responses:
 *       200:
 *         description: Array of compact metric snapshots
 */
router.get('/history', metricsController.getHistory)

/**
 * @openapi
 * /api/v1/metrics/history/series/{metric}:
 *   get:
 *     tags: [Metrics]
 *     summary: Get a specific metric series for sparklines
 *     parameters:
 *       - in: path
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *         description: The metric series to retrieve
 *     responses:
 *       200:
 *         description: Array of metric values
 */
router.get('/history/series/:metric', metricsController.getHistorySeries)

/**
 * @openapi
 * /api/v1/metrics/history:
 *   delete:
 *     tags: [Metrics]
 *     summary: Clear the in-memory metrics history (debug/maintenance)
 *     responses:
 *       200:
 *         description: Operation result
 */
router.delete('/history', metricsController.clearHistory)

/**
 * @openapi
 * /api/v1/metrics/prometheus:
 *   get:
 *     tags: [Metrics]
 *     summary: Prometheus exposition endpoint for basic metrics
 *     responses:
 *       200:
 *         description: Prometheus text format
 */
// Prometheus exposition endpoint (public): returns Prometheus text format.
// If you want this protected, re-add the auth middleware here.
router.get('/prometheus', metricsController.getPrometheus)

module.exports = router
