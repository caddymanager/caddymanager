#!/usr/bin/env node

/**
 * Generate build information for the application
 * This script can be called during the build process to inject build metadata
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateBuildInfo() {
  console.log('🔄 Generating build information...');
  
  // Ensure we're in the project root
  const projectRoot = path.resolve(__dirname, '..');
  process.chdir(projectRoot);
  
  console.log(`📁 Working directory: ${process.cwd()}`);
  
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
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
    console.log('📋 Using git info from build arguments');
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
      console.log('📋 Using git info from git commands');
    } catch (error) {
      console.warn('⚠️ Could not get git information:', error.message);
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

  // Write build info to public directory for runtime access
  const publicDir = path.join(projectRoot, 'public');
  console.log(`📁 Public directory: ${publicDir}`);
  
  if (!fs.existsSync(publicDir)) {
    console.log('📁 Creating public directory...');
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const publicBuildInfoPath = path.join(publicDir, 'build-info.json');
  console.log(`📝 Writing to: ${publicBuildInfoPath}`);
  
  fs.writeFileSync(
    publicBuildInfoPath,
    JSON.stringify(buildInfo, null, 2)
  );

  // Also write to src for compile-time access
  const srcDir = path.join(projectRoot, 'src');
  console.log(`📁 Source directory: ${srcDir}`);
  
  if (fs.existsSync(srcDir)) {
    const buildInfoModule = `// Auto-generated build information
// This file is generated during the build process
export const buildInfo = ${JSON.stringify(buildInfo, null, 2)};

export default buildInfo;
`;
    
    const srcBuildInfoPath = path.join(srcDir, 'build-info.js');
    console.log(`📝 Writing to: ${srcBuildInfoPath}`);
    
    fs.writeFileSync(srcBuildInfoPath, buildInfoModule);
    
    // Verify the file was created
    if (fs.existsSync(srcBuildInfoPath)) {
      console.log('✅ build-info.js successfully created in src directory');
    } else {
      console.error('❌ Failed to create build-info.js in src directory');
    }
  } else {
    console.warn(`⚠️ Source directory not found: ${srcDir}`);
  }

  console.log('✅ Build information generated successfully');
  console.log(`📦 Version: ${buildInfo.version}`);
  console.log(`🔢 Build: ${buildInfo.buildNumber}`);
  console.log(`🌿 Branch: ${buildInfo.git.branch || 'unknown'}`);
  console.log(`📝 Commit: ${buildInfo.git.shortCommit || 'unknown'}`);
  
  return buildInfo;
}

// Run if called directly - fix for ES modules
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    generateBuildInfo();
  } catch (error) {
    console.error('❌ Error generating build info:', error.message);
    process.exit(1);
  }
}

export default generateBuildInfo;
