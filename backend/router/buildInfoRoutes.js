const express = require('express');
const buildInfoController = require('../controllers/buildInfoController');

const router = express.Router();

/**
 * @swagger
 * /api/v1/build-info:
 *   get:
 *     summary: Get detailed build information
 *     description: Returns comprehensive build information including version, git details, runtime info, and system metrics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Build information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: caddymanager-backend
 *                     version:
 *                       type: string
 *                       example: 3.0.0
 *                     description:
 *                       type: string
 *                       example: Caddy Manager Backend
 *                     buildDate:
 *                       type: string
 *                       format: date-time
 *                     buildNumber:
 *                       type: string
 *                       example: "123"
 *                     nodeVersion:
 *                       type: string
 *                       example: v18.0.0
 *                     environment:
 *                       type: string
 *                       example: production
 *                     git:
 *                       type: object
 *                       properties:
 *                         commit:
 *                           type: string
 *                         shortCommit:
 *                           type: string
 *                         branch:
 *                           type: string
 *                         lastCommitDate:
 *                           type: string
 *                         lastCommitMessage:
 *                           type: string
 *                     runtime:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                         platform:
 *                           type: string
 *                         arch:
 *                           type: string
 */
router.get('/', buildInfoController.getBuildInfo);

/**
 * @swagger
 * /api/v1/build-info/version:
 *   get:
 *     summary: Get simplified version information
 *     description: Returns basic version and build information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Version information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: caddymanager-backend
 *                     version:
 *                       type: string
 *                       example: 3.0.0
 *                     buildNumber:
 *                       type: string
 *                       example: "123"
 *                     environment:
 *                       type: string
 *                       example: production
 *                     buildDate:
 *                       type: string
 *                       format: date-time
 *                     commit:
 *                       type: string
 *                       example: a1b2c3d4
 *                     branch:
 *                       type: string
 *                       example: main
 */
router.get('/version', buildInfoController.getVersion);

/**
 * @swagger
 * /api/v1/build-info/health:
 *   get:
 *     summary: Get health check with version info
 *     description: Returns server health status along with basic version information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Health check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       example: 3600
 *                     version:
 *                       type: string
 *                       example: 3.0.0
 *                     buildNumber:
 *                       type: string
 *                       example: "123"
 *                     environment:
 *                       type: string
 *                       example: production
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: string
 *                           example: "45 MB"
 *                         total:
 *                           type: string
 *                           example: "128 MB"
 */
router.get('/health', buildInfoController.getHealth);

// All routes in this file are prefixed with /api/v1/build-info in the main app router

module.exports = router;
