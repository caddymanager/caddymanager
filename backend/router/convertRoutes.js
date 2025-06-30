const express = require('express');
const convertController = require('../controllers/convertController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all convert routes
router.use(protect);

/**
 * @swagger
 * /api/v1/convert/caddyfile-to-json:
 *   post:
 *     summary: Convert Caddyfile to JSON configuration
 *     description: Converts a Caddyfile to Caddy JSON configuration
 *     tags: [Convert]
 *     parameters:
 *       - in: query
 *         name: serverId
 *         schema:
 *           type: string
 *         description: Optional ID of a Caddy server to use for conversion
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *             description: Caddyfile content to convert as plain text
 *     responses:
 *       200:
 *         description: Conversion successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 json:
 *                   type: object
 *                   description: The converted JSON configuration
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the conversion was successful
 *       400:
 *         description: Missing or invalid input
 *       500:
 *         description: Server error
 */
router.post('/caddyfile-to-json', convertController.caddyfileToJson);

module.exports = router;