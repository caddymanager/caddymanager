const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in to the application
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's username
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', authController.login);

// Protected routes - require authentication
router.use(protect);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized, token missing or invalid
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', authController.getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/update-profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New email address
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Username or email already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/update-profile', authController.updateProfile);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (min 8 characters)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/change-password', authController.changePassword);

// Admin only routes
router.use(authorize('admin'));

/**
 * @swagger
 * /api/v1/auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     responses:
 *       200:
 *         description: List of all users
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
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       lastLogin:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, admin access required
 *       500:
 *         description: Server error
 */
router.get('/users', authController.getAllUsers);

/**
 * @swagger
 * /api/v1/auth/update-user-role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to update
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: New role
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/update-user-role', authController.updateUserRole);

/**
 * @swagger
 * /api/v1/auth/create-user:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username (min 3 characters)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address (optional)
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password (min 8 characters)
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 description: User role
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Username already exists or invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, admin access required
 *       500:
 *         description: Server error
 */
router.post('/create-user', authController.createUser);

/**
 * @swagger
 * /api/v1/auth/delete-user/{userId}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete own account
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/delete-user/:userId', authController.deleteUser);

// All routes in this file are prefixed with /api/v1/auth in the main app router

module.exports = router;