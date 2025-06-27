const catchAsync = require('../utils/catchAsync');
const buildInfoService = require('../services/buildInfoService');

/**
 * Get build information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBuildInfo = catchAsync(async (req, res) => {
  // Get complete build info from service
  const buildInfo = buildInfoService.getBuildInfo();
  
  // Add runtime information
  const runtimeInfo = {
    ...buildInfo,
    runtime: {
      uptime: process.uptime(),
      uptimeFormatted: buildInfoService.getUptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      currentTime: new Date().toISOString()
    }
  };

  res.status(200).json({
    success: true,
    data: runtimeInfo
  });
});

/**
 * Get simplified version info
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVersion = catchAsync(async (req, res) => {
  const gitInfo = buildInfoService.getGitInfo();
  
  const version = {
    name: buildInfoService.getBuildInfo().name,
    version: buildInfoService.getVersion(),
    buildNumber: buildInfoService.getBuildNumber(),
    environment: buildInfoService.getEnvironment(),
    buildDate: buildInfoService.getBuildInfo().buildDate,
    commit: gitInfo.shortCommit || 'unknown',
    branch: gitInfo.branch || 'unknown',
    versionString: buildInfoService.getVersionString(),
    buildSummary: buildInfoService.getBuildSummary()
  };

  res.status(200).json({
    success: true,
    data: version
  });
});

/**
 * Get health check with version info
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getHealth = catchAsync(async (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uptimeFormatted: buildInfoService.getUptime(),
    version: buildInfoService.getVersion(),
    buildNumber: buildInfoService.getBuildNumber(),
    versionString: buildInfoService.getVersionString(),
    environment: buildInfoService.getEnvironment(),
    buildSummary: buildInfoService.getBuildSummary(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB'
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    }
  };

  res.status(200).json({
    success: true,
    data: health
  });
});

module.exports = {
  getBuildInfo,
  getVersion,
  getHealth
};
