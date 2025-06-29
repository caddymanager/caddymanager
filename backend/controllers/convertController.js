const convertService = require('../services/convertService');
const auditService = require('../services/auditService');

/**
 * Controller for handling Caddy configuration conversion operations
 */
const convertController = {
  /**
   * Convert Caddyfile format to JSON
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async caddyfileToJson(req, res) {
    try {
      // Extract Caddyfile content from request body
      // Note: Expecting plain text in the request body
      const caddyfileContent = req.body;
      // Extract optional serverId from query params
      const { serverId } = req.query;
      
      if (!caddyfileContent) {
        return res.status(400).json({
          success: false,
          error: 'Caddyfile content is required'
        });
      }
      
      // Call the service to convert Caddyfile to JSON
      const jsonConfig = await convertService.caddyfileToJson(caddyfileContent, serverId);
      
      // Log the conversion action in audit logs
      await auditService.logAction({
        action: 'convert_caddyfile_to_json',
        user: req.user,
        resourceType: serverId ? 'server' : 'system',
        resourceId: serverId || 'none',
        details: {
          caddyfileSize: caddyfileContent.length,
          serverId: serverId || null,
          success: true
        },
        statusCode: 200,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        json: jsonConfig
      });
    } catch (error) {
      console.error('Error in caddyfileToJson controller:', error);

      // Log the failed conversion attempt
      if (req.user) {
        await auditService.logAction({
          action: 'convert_caddyfile_to_json',
          user: req.user,
          resourceType: req.query.serverId ? 'server' : 'system',
          resourceId: req.query.serverId || 'none',
          details: {
            error: error.message,
            success: false
          },
          statusCode: 500,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      // Provide a structured error response with both a short message and details
      return res.status(500).json({
        success: false,
        error: error.message || 'Error converting Caddyfile to JSON',
        details: {
          message: error.message,
          // Include the original error message for detailed debugging
          originalError: error.toString(),
          // Highlight if it's a module-related issue
          isMissingModule: error.message?.includes('unrecognized global option') || 
                           error.message?.includes('module not registered') ||
                           error.message?.includes('unknown directive')
        }
      });
    }
  }
};

module.exports = convertController;