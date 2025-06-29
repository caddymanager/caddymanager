const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const apiKeyController = require('../controllers/apiKeyController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: API key management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiKey:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: API key ID
 *         name:
 *           type: string
 *           description: Name of the API key
 *         permissions:
 *           type: object
 *           properties:
 *             read:
 *               type: boolean
 *             write:
 *               type: boolean
 *             delete:
 *               type: boolean
 *         lastUsed:
 *           type: string
 *           format: date-time
 *           description: When the API key was last used
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When the API key expires
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the API key was created
 *         isActive:
 *           type: boolean
 *           description: Whether the API key is active
 *     NewApiKey:
 *       allOf:
 *         - $ref: '#/components/schemas/ApiKey'
 *         - type: object
 *           properties:
 *             key:
 *               type: string
 *               description: The actual API key (only returned once upon creation)
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/keys:
 *   get:
 *     summary: Get all API keys belonging to the authenticated user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of API keys
 *                 apiKeys:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the API key
 *                 minLength: 3
 *               permissions:
 *                 type: object
 *                 properties:
 *                   read:
 *                     type: boolean
 *                     default: true
 *                   write:
 *                     type: boolean
 *                     default: false
 *                   delete:
 *                     type: boolean
 *                     default: false
 *               expiration:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date for the API key
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 apiKey:
 *                   $ref: '#/components/schemas/NewApiKey'
 *                 message:
 *                   type: string
 *                   example: API key created successfully. Please save this key as it won't be shown again.
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/')
  .get(apiKeyController.getApiKeys)
  .post(apiKeyController.createApiKey);

/**
 * @swagger
 * /api/keys/{id}:
 *   get:
 *     summary: Get a specific API key by ID
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 apiKey:
 *                   $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name for the API key
 *               permissions:
 *                 type: object
 *                 properties:
 *                   read:
 *                     type: boolean
 *                   write:
 *                     type: boolean
 *                   delete:
 *                     type: boolean
 *               isActive:
 *                 type: boolean
 *                 description: Set to false to deactivate the key
 *     responses:
 *       200:
 *         description: API key updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 apiKey:
 *                   $ref: '#/components/schemas/ApiKey'
 *                 message:
 *                   type: string
 *                   example: API key updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API key deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 *       500:
 *         description: Server error
 */
router.route('/:id')
  .get(apiKeyController.getApiKey)
  .put(apiKeyController.updateApiKey)
  .delete(apiKeyController.deleteApiKey);

/**
 * @swagger
 * /api/keys/admin/all:
 *   get:
 *     summary: Get all API keys across all users (Admin only)
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of API keys
 *                 apiKeys:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ApiKey'
 *                       - type: object
 *                         properties:
 *                           userId:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                               email:
 *                                 type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, admin access required
 *       500:
 *         description: Server error
 */
router.get('/admin/all', authorize('admin'), apiKeyController.getAllApiKeys);

/**
 * @swagger
 * /api/keys/admin/revoke/{id}:
 *   put:
 *     summary: Revoke an API key (Admin only)
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 apiKey:
 *                   $ref: '#/components/schemas/ApiKey'
 *                 message:
 *                   type: string
 *                   example: API key revoked successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, admin access required
 *       404:
 *         description: API key not found
 *       500:
 *         description: Server error
 */
router.put('/admin/revoke/:id', authorize('admin'), apiKeyController.revokeApiKey);

module.exports = router;