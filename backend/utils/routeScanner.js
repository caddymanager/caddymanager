const Permission = require('../database/models/permission.model');
const logger = require('../config/logger');

async function scanAndRegisterRoutes(router, basePath = '') {
  const routes = [];
  const existingRoutes = await Permission.find({});

  function extractRoutes(stack, path = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        let fullPath = basePath + path + middleware.route.path;
        fullPath = decodeURIComponent(fullPath.replace(/\/$/, '')); // Normalize and decode path

        // Remove /v1 prefix
        if (fullPath.startsWith('/v1')) {
          fullPath = fullPath.slice(3);
        }

        // Convert Express route parameters to regex
        fullPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, '[^/]+');

        const methods = Object.keys(middleware.route.methods);

        methods.forEach((method) => {
          routes.push({
            endpoint: {
              method: method.toUpperCase(),
              path: `^${fullPath}$` // Ensure the regex matches the entire path
            },
            requiredRight: null,
            description: `Auto-registered: ${method.toUpperCase()} ${fullPath}`,
            isActive: true
          });
        });
      } else if (middleware.name === 'router') {
        const nestedPath = path + middleware.regexp.source
          .replace(/\\\//g, '/')
          .replace(/\(\?:\(\[\^/g, '')
          .replace(/\)\]\+\)/g, '');
        extractRoutes(middleware.handle.stack, decodeURIComponent(nestedPath));
      }
    });
  }

  extractRoutes(router.stack);

  // Get all current route identifiers
  const currentRouteIdentifiers = routes.map(r => `${r.endpoint.method} ${r.endpoint.path}`);
  logger.info('Current Route Identifiers:', currentRouteIdentifiers);

  // Mark deprecated routes
  const deprecatedRoutes = await Permission.updateMany(
    {
      $expr: {
        $not: {
          $in: [
            { $concat: ['$endpoint.method', ' ', '$endpoint.path'] },
            currentRouteIdentifiers
          ]
        }
      }
    },
    {
      $set: { 
        isActive: false,
        description: `Deprecated: ${new Date().toISOString()}`
      }
    }
  );

  logger.info('Deprecated Routes:', deprecatedRoutes);

  // Update/Insert current routes
  let updatedCount = 0;
  for (const route of routes) {
    const updated = await Permission.findOneAndUpdate(
      {
        'endpoint.method': route.endpoint.method,
        'endpoint.path': route.endpoint.path
      },
      { 
        $setOnInsert: {
          endpoint: route.endpoint,
          requiredRight: null,
          description: route.description
        },
        $set: {
          isActive: true // Always set active for current routes
        }
      },
      { upsert: true, new: true }
    );
    if (updated) updatedCount++;
  }

  logger.info(`Found ${routes.length} current routes`);
  logger.info(`Found ${existingRoutes.length} total routes in database`);
  logger.info(`Updated/Inserted ${updatedCount} routes`);
  logger.info(`Marked ${deprecatedRoutes.modifiedCount} routes as deprecated`);

  return routes;
}

module.exports = { scanAndRegisterRoutes };
