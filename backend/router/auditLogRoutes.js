const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * Audit Log Routes
 * All routes require authentication
 * Most routes require admin role
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       required:
 *         - action
 *         - user
 *         - resourceType
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the audit log entry
 *         action:
 *           type: string
 *           description: The action performed by the user
 *         user:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               description: The ID of the user performing the action
 *             username:
 *               type: string
 *               description: The username of the user performing the action
 *         resourceType:
 *           type: string
 *           enum: [config, server, user, apiKey, system, other]
 *           description: The type of resource affected by the action
 *         resourceId:
 *           type: string
 *           description: The ID of the resource affected by the action
 *         details:
 *           type: object
 *           description: Additional details about the action
 *         statusCode:
 *           type: number
 *           description: The HTTP status code of the response
 *         ipAddress:
 *           type: string
 *           description: The IP address of the user
 *         userAgent:
 *           type: string
 *           description: The user agent of the request
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: The date and time when the action was performed
 *       example:
 *         _id: "60f7b5c9e4b9b10e8a8f48e3"
 *         action: "update_server"
 *         user:
 *           userId: "60f7b5c9e4b9b10e8a8f48e0"
 *           username: "admin"
 *         resourceType: "server"
 *         resourceId: "60f7b5c9e4b9b10e8a8f48e1"
 *         details:
 *           name: "Production Server"
 *           updates: 
 *             name: "Production Server"
 *             apiUrl: "https://caddy-server.example.com"
 *         statusCode: 200
 *         ipAddress: "192.168.1.1"
 *         userAgent: "Mozilla/5.0"
 *         timestamp: "2023-07-21T12:00:00.000Z"
 * 
 *     PaginationResponse:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *           description: The total number of items available
 *         limit:
 *           type: number
 *           description: The number of items per page
 *         skip:
 *           type: number
 *           description: The number of items skipped
 *         hasMore:
 *           type: boolean
 *           description: Whether there are more items available
 *       example:
 *         total: 100
 *         limit: 20
 *         skip: 0
 *         hasMore: true
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   - name: Audit Logs
 *     description: Audit log operations
 */

// Base route is protected
router.use(protect);

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Get all audit logs
 *     description: Retrieve a list of audit logs with filtering and pagination
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: timestamp
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: resourceId
 *         schema:
 *           type: string
 *         description: Filter by resource ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Filter by username
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Successful operation
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
 *                   example: Audit logs retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
router.get('/', authorize('admin'), auditLogController.getAuditLogs);

/**
 * @swagger
 * /api/v1/audit-logs/stats:
 *   get:
 *     summary: Get audit log statistics
 *     description: Retrieve statistics about audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
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
 *                   example: Audit log statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     actionStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           count:
 *                             type: number
 *                     resourceStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           resourceType:
 *                             type: string
 *                           count:
 *                             type: number
 *                     userStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           username:
 *                             type: string
 *                           count:
 *                             type: number
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                     dailyActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
router.get('/stats', authorize('admin'), auditLogController.getAuditStats);

/**
 * @swagger
 * /api/v1/audit-logs/filters:
 *   get:
 *     summary: Get filter options
 *     description: Retrieve filter options for audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
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
 *                   example: Filter options retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     resourceTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           username:
 *                             type: string
 *                           count:
 *                             type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
router.get('/filters', authorize('admin'), auditLogController.getFilterOptions);

/**
 * @swagger
 * /api/v1/audit-logs/resource/{resourceType}/{resourceId}:
 *   get:
 *     summary: Get audit logs for a specific resource
 *     description: Retrieve audit logs for a specific resource
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *         description: Type of resource
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of resource
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: timestamp
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successful operation
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
 *                   example: Resource audit logs retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
router.get('/resource/:resourceType/:resourceId', authorize('admin'), auditLogController.getResourceAuditLogs);

/**
 * @swagger
 * /api/v1/audit-logs/user/{userId}:
 *   get:
 *     summary: Get audit logs for a specific user
 *     description: Retrieve audit logs for a specific user. Users can see their own logs, admins can see any user's logs.
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of user
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: timestamp
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successful operation
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
 *                   example: User audit logs retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role or must be the user's own logs
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', (req, res, next) => {
  // If user is trying to access their own logs, allow it
  // Otherwise, restrict to admin
  if (req.params.userId === req.user.id) {
    return next();
  }
  
  // If not their own logs, check if admin
  return authorize('admin')(req, res, next);
}, auditLogController.getUserAuditLogs);

module.exports = router;