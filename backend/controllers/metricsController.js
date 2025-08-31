const metricsService = require('../services/metricsService')
const catchAsync = require('../utils/catchAsync')

const getMetrics = catchAsync(async (req, res) => {
  const data = await metricsService.getAllMetrics()
  res.status(200).json({ success: true, data })
})

const getApp = catchAsync(async (req, res) => {
  const data = await metricsService.getAppMetrics()
  res.status(200).json({ success: true, data })
})

const getServers = catchAsync(async (req, res) => {
  const data = await metricsService.getServerMetrics()
  res.status(200).json({ success: true, data })
})

const getConfigs = catchAsync(async (req, res) => {
  const data = await metricsService.getConfigMetrics()
  res.status(200).json({ success: true, data })
})

const getHistory = catchAsync(async (req, res) => {
  const data = await metricsService.getMetricsHistory()
  res.status(200).json({ success: true, data })
})

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
