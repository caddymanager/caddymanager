/**
 * Build Information Service
 * Provides easy access to build and version information throughout the application
 */

let buildInfo;

// Try to load build info on initialization
try {
  buildInfo = require('../build-info');
  console.log('✅ Build info loaded successfully');
} catch (error) {
  console.warn('⚠️ Could not load build info file:', error.message);
  console.warn('📁 Expected file location: build-info.js');
  
  // Fallback build info if file doesn't exist
  buildInfo = {
    name: 'caddymanager-backend',
    version: 'unknown',
    description: 'Caddy Manager Backend',
    buildDate: new Date().toISOString(),
    buildNumber: 'local',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    git: {},
    error: 'Build info not generated: ' + error.message
  };
}

/**
 * Get complete build information
 * @returns {Object} Complete build information object
 */
const getBuildInfo = () => {
  return { ...buildInfo };
};

/**
 * Get application version
 * @returns {string} Application version
 */
const getVersion = () => {
  return buildInfo.version;
};

/**
 * Get build number
 * @returns {string} Build number
 */
const getBuildNumber = () => {
  return buildInfo.buildNumber;
};

/**
 * Get environment
 * @returns {string} Current environment
 */
const getEnvironment = () => {
  return buildInfo.environment;
};

/**
 * Get version string with build number
 * @returns {string} Formatted version string
 */
const getVersionString = () => {
  const version = buildInfo.version;
  const buildNumber = buildInfo.buildNumber;
  return buildNumber !== 'local' ? `${version}.${buildNumber}` : version;
};

/**
 * Get build summary for logging
 * @returns {string} Build summary string
 */
const getBuildSummary = () => {
  const parts = [];
  parts.push(`v${getVersionString()}`);
  
  if (buildInfo.git?.shortCommit) {
    parts.push(`commit ${buildInfo.git.shortCommit}`);
  }
  
  if (buildInfo.git?.branch && buildInfo.git.branch !== 'main') {
    parts.push(`on ${buildInfo.git.branch}`);
  }
  
  if (buildInfo.environment && buildInfo.environment !== 'production') {
    parts.push(`(${buildInfo.environment})`);
  }
  
  return parts.join(' ');
};

/**
 * Get git information
 * @returns {Object} Git information object
 */
const getGitInfo = () => {
  return buildInfo.git || {};
};

/**
 * Check if this is a production build
 * @returns {boolean} True if production build
 */
const isProduction = () => {
  return buildInfo.environment === 'production';
};

/**
 * Check if this is a development build
 * @returns {boolean} True if development build
 */
const isDevelopment = () => {
  return buildInfo.environment === 'development';
};

/**
 * Get uptime in human readable format
 * @returns {string} Formatted uptime
 */
const getUptime = () => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

module.exports = {
  getBuildInfo,
  getVersion,
  getBuildNumber,
  getEnvironment,
  getVersionString,
  getBuildSummary,
  getGitInfo,
  isProduction,
  isDevelopment,
  getUptime
};
