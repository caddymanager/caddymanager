const express = require('express');
const caddyController = require('../controllers/caddyController');
// All routes in this file are prefixed with /api/v1/caddy in the main app router
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CaddyServer:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The server ID
 *         name:
 *           type: string
 *           description: Server name
 *         apiUrl:
 *           type: string
 *           description: API URL of the Caddy server
 *         apiPort:
 *           type: number
 *           description: API port number
 *           default: 2019
 *         adminApiPath:
 *           type: string
 *           description: Admin API path
 *           default: "/config/"
 *         active:
 *           type: boolean
 *           description: Whether the server is active
 *           default: true
 *         status:
 *           type: string
 *           enum: [online, offline, unknown]
 *           description: Current server status
 *         lastPinged:
 *           type: string
 *           format: date-time
 *           description: When the server was last contacted successfully
 *       required:
 *         - name
 *         - apiUrl
 *       example:
 *         name: "Production Server"
 *         apiUrl: "http://caddy.example.com"
 *         apiPort: 2019
 *         adminApiPath: "/config/"
 *         active: true
 *         status: "online"
 *
 *     CaddyConfig:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The configuration ID
 *         server:
 *           type: string
 *           description: The ID of the server this configuration belongs to
 *         name:
 *           type: string
 *           description: Configuration name
 *         format:
 *           type: string
 *           enum: [json]
 *           description: Configuration format - always JSON
 *         jsonConfig:
 *           type: object
 *           description: The JSON configuration content
 *         status:
 *           type: string
 *           enum: [draft, live, archived]
 *           description: Configuration status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         metadata:
 *           type: object
 *           properties:
 *             description:
 *               type: string
 *             version:
 *               type: string
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *         history:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Error message
 *         error:
 *           type: string
 *           description: Detailed error information
 */

/**
 * @swagger
 * tags:
 *   - name: Caddy Servers
 *     description: Operations for managing Caddy servers
 *   - name: Server Configuration
 *     description: Operations for managing Caddy server configurations
 */

// =============================================
// SERVER MANAGEMENT ENDPOINTS 
// =============================================

/**
 * @swagger
 * /api/v1/caddy/servers:
 *   get:
 *     summary: Get all Caddy servers
 *     tags: [Caddy Servers]
 *     responses:
 *       200:
 *         description: List of all Caddy servers
 *       500:
 *         description: Server error
 *   post:
 *     summary: Add a new Caddy server
 *     tags: [Caddy Servers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               apiUrl:
 *                 type: string
 *               apiPort:
 *                 type: number
 *               adminApiPath:
 *                 type: string
 *               active:
 *                 type: boolean
 *               pullExistingConfig:
 *                 type: boolean
 *                 description: If true, the system will attempt to pull the existing configuration from the server upon creation
 *     responses:
 *       201:
 *         description: Server added successfully
 *       500:
 *         description: Server error
 */
router.route('/servers')
  .get(caddyController.getAllServers)
  .post(caddyController.addServer);

/**
 * @swagger
 * /api/v1/caddy/servers/status:
 *   get:
 *     summary: Check status of all Caddy servers
 *     tags: [Caddy Servers]
 *     responses:
 *       200:
 *         description: Status of all servers
 *       500:
 *         description: Server error
 */
router.get('/servers/status', caddyController.checkAllServersStatus);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}:
 *   get:
 *     summary: Get a Caddy server by ID
 *     tags: [Caddy Servers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Server details
 *       404:
 *         description: Server not found
 *   put:
 *     summary: Update a Caddy server
 *     tags: [Caddy Servers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Server updated successfully
 *       404:
 *         description: Server not found
 *   delete:
 *     summary: Delete a Caddy server
 *     tags: [Caddy Servers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Server deleted successfully
 *       404:
 *         description: Server not found
 */
router.route('/servers/:id')
  .get(caddyController.getServerById)
  .put(caddyController.updateServer)
  .delete(caddyController.deleteServer);

/**
 * @swagger
 * /api/v1/caddy/test-connection:
 *   post:
 *     summary: Test connection to a Caddy server
 *     tags: [Caddy Servers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiUrl:
 *                 type: string
 *               apiPort:
 *                 type: number
 *               adminApiPath:
 *                 type: string
 *               auth:
 *                 type: object
 *     responses:
 *       200:
 *         description: Connection successful
 *       400:
 *         description: Connection failed
 */
router.post('/test-connection', caddyController.testConnection);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}/status:
 *   get:
 *     summary: Check status of a specific Caddy server
 *     tags: [Caddy Servers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Server status
 *       404:
 *         description: Server not found
 */
router.get('/servers/:id/status', caddyController.checkServerStatus);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}/current-config:
 *   get:
 *     summary: Get the current running configuration from a Caddy server
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: skipSave
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: If true, the configuration will be retrieved but not saved in the database
 *     responses:
 *       200:
 *         description: Current running configuration retrieved successfully
 *       404:
 *         description: Server not found
 *       500:
 *         description: Error retrieving configuration
 */
router.get('/servers/:id/current-config', caddyController.getCurrentRunningConfig);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}/config:
 *   get:
 *     summary: Get configuration from a Caddy server
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       500:
 *         description: Error retrieving configuration
 *   put:
 *     summary: Update configuration on a Caddy server
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       500:
 *         description: Error updating configuration
 */
router.route('/servers/:id/config')
  .get(caddyController.getConfig)
  .put(caddyController.updateConfig);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}/load-config:
 *   post:
 *     summary: Load configuration to a Caddy server
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration loaded successfully
 *       500:
 *         description: Error loading configuration
 */
router.post('/servers/:id/load-config', caddyController.loadConfig);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}/generate/start-command:
 *   get:
 *     summary: Generate a command to start Caddy with proper settings
 *     tags: [Caddy Servers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Start command generated successfully
 *       404:
 *         description: Server not found
 */
router.get('/servers/:id/generate/start-command', caddyController.generateStartCommand);

/**
 * @swagger
 * /api/v1/caddy/servers/{id}/configs:
 *   get:
 *     summary: Get all configurations for a server
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 *       500:
 *         description: Error retrieving configurations
 *   post:
 *     summary: Create a new configuration for a server
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Configuration created successfully
 *       500:
 *         description: Error creating configuration
 */
router.route('/servers/:id/configs')
  .get(caddyController.getConfigsForServer)
  .post(caddyController.createConfig);

/**
 * @swagger
 * /api/v1/caddy/configs/{configId}/apply:
 *   post:
 *     summary: Apply a configuration to one or more servers
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: configId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serverIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Configuration applied successfully
 *       500:
 *         description: Error applying configuration
 */
router.post('/configs/:configId/apply', caddyController.applyConfig);

/**
 * @swagger
 * /api/v1/caddy/configs/{configId}:
 *   get:
 *     summary: Get a specific configuration by ID
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: configId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       404:
 *         description: Configuration not found
 */
router.get('/configs/:configId', caddyController.getConfigById);

/**
 * @swagger
 * /api/v1/caddy/configs:
 *   get:
 *     summary: Get all stored configurations
 *     tags: [Server Configuration]
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 *       500:
 *         description: Error retrieving configurations
 *   post:
 *     summary: Add a new configuration
 *     tags: [Server Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 required: true
 *               servers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of server IDs this configuration applies to
 *               jsonConfig:
 *                 type: object
 *                 description: The JSON configuration content
 *               status:
 *                 type: string
 *                 enum: [draft, live, archived]
 *                 default: draft
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Configuration added successfully
 *       400:
 *         description: Error adding configuration
 */
router.route('/configs')
  .get(caddyController.getAllConfigs)
  .post(caddyController.addConfig);

/**
 * @swagger
 * /api/v1/caddy/configs/{id}:
 *   get:
 *     summary: Get configuration by ID
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration details
 *       404:
 *         description: Configuration not found
 *   put:
 *     summary: Update configuration metadata
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       404:
 *         description: Configuration not found
 *   delete:
 *     summary: Delete a configuration by ID
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration deleted successfully
 *       404:
 *         description: Configuration not found
 */
router.route('/configs/:id')
  .get(caddyController.getConfigById)
  .put(caddyController.updateConfigMetadata)
  .delete(caddyController.deleteConfig);

/**
 * @swagger
 * /api/v1/caddy/configs/{id}/content:
 *   put:
 *     summary: Update configuration content
 *     tags: [Server Configuration]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration content updated successfully
 *       404:
 *         description: Configuration not found
 */
router.put('/configs/:id/content', caddyController.updateConfigContent);

module.exports = router;