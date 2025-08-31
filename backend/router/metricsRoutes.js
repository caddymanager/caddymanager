const express = require('express')
const router = express.Router()
const metricsController = require('../controllers/metricsController')

// Public metrics endpoints
router.get('/', metricsController.getMetrics)
router.get('/app', metricsController.getApp)
router.get('/servers', metricsController.getServers)
router.get('/configs', metricsController.getConfigs)
router.get('/history', metricsController.getHistory)
router.delete('/history', metricsController.clearHistory)

module.exports = router
