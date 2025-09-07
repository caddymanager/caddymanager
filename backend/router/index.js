const express = require('express');
const caddyRoutes = require('./caddyRoutes');
const convertRoutes = require('./convertRoutes');
const authRoutes = require('./authRoutes');
const apiKeyRoutes = require('./apiKeyRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const buildInfoRoutes = require('./buildInfoRoutes');
const metricsRoutes = require('./metricsRoutes');

const router = express.Router();

// API version prefix
const API_PREFIX = '/api/v1';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token authentication
 *     apiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: API key authentication
 *     apiKeyAuthAlt:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: ApiKey
 *       description: Alternative API key authentication using Bearer format with "ApiKey" prefix
 */

// Mount Caddy routes
router.use(`${API_PREFIX}/caddy`, caddyRoutes);

// Mount Convert routes
router.use(`${API_PREFIX}/convert`, convertRoutes);

// Mount Authentication routes
router.use(`${API_PREFIX}/auth`, authRoutes);

// Mount API Key routes
router.use(`${API_PREFIX}/apikeys`, apiKeyRoutes);

// Mount Audit Log routes
router.use(`${API_PREFIX}/audit-logs`, auditLogRoutes);

// Mount Build Info routes
router.use(`${API_PREFIX}/build-info`, buildInfoRoutes);

// Mount Metrics routes
router.use(`${API_PREFIX}/metrics`, metricsRoutes);

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the API is running
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// Health check endpoint
router.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;