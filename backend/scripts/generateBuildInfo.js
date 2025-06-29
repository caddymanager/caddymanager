#!/usr/bin/env node

/**
 * Generate build information for the CaddyManager Backend
 * This script can be called during the build process to inject build metadata
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateBuildInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Get git information - prefer environment variables from Docker build args
  let gitInfo = {};
  
  if (process.env.GIT_COMMIT && process.env.GIT_BRANCH) {
    // Use build args passed from CI/CD
    gitInfo = {
      commit: process.env.GIT_COMMIT,
      shortCommit: process.env.GIT_COMMIT ? process.env.GIT_COMMIT.substring(0, 8) : 'unknown',
      branch: process.env.GIT_BRANCH,
      lastCommitDate: 'unknown', // Not available via build args
      lastCommitMessage: 'unknown', // Not available via build args
    };
    console.log('Using git info from build arguments');
  } else {
    // Fallback to git commands (for local development)
    try {
      gitInfo = {
        commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        shortCommit: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
        branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
        lastCommitDate: execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim(),
        lastCommitMessage: execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim(),
      };
      console.log('Using git info from git commands');
    } catch (error) {
      console.warn('Could not get git information:', error.message);
      gitInfo = {
        commit: 'unknown',
        shortCommit: 'unknown',
        branch: 'unknown',
        lastCommitDate: 'unknown',
        lastCommitMessage: 'unknown',
      };
    }
  }

  // Generate build info
  const buildInfo = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    buildNumber: process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'local',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    git: gitInfo,
    // GitHub Actions specific info
    ...(process.env.GITHUB_ACTIONS && {
      github: {
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER,
        actor: process.env.GITHUB_ACTOR,
        repository: process.env.GITHUB_REPOSITORY,
        ref: process.env.GITHUB_REF,
        sha: process.env.GITHUB_SHA,
        workflow: process.env.GITHUB_WORKFLOW,
      }
    })
  };

  // Write build info to current working directory for runtime access
  const outDir = process.cwd();

  fs.writeFileSync(
    path.join(outDir, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  // Also write as a JS module for easy importing
  const buildInfoModule = `// Auto-generated build information
// This file is generated during the build process
module.exports = ${JSON.stringify(buildInfo, null, 2)};
`;
  
  fs.writeFileSync(
    path.join(outDir, 'build-info.js'),
    buildInfoModule
  );

  console.log('✅ Build information generated successfully');
  console.log(`📦 Version: ${buildInfo.version}`);
  console.log(`🔢 Build: ${buildInfo.buildNumber}`);
  console.log(`🌿 Branch: ${buildInfo.git.branch || 'unknown'}`);
  console.log(`📝 Commit: ${buildInfo.git.shortCommit || 'unknown'}`);
  
  return buildInfo;
}

// Run if called directly
if (require.main === module) {
  generateBuildInfo();
}

module.exports = generateBuildInfo;
