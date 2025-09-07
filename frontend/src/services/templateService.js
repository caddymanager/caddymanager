/**
 * Template Service for Caddy Manager
 * Manages configuration templates and their customization
 */

// Import template files
import reverseProxyTemplate from '@/assets/templates/configurations/reverse_proxy.json';
import basicWebTemplate from '@/assets/templates/configurations/basic_web.json';
import apiGatewayTemplate from '@/assets/templates/configurations/api_gateway.json';
import loadBalancerTemplate from '@/assets/templates/configurations/load_balancer.json';
import staticSiteTemplate from '@/assets/templates/configurations/static_site.json';
import emptyTemplate from '@/assets/templates/configurations/empty.json';

/**
 * Deep clone function that's more robust than structuredClone
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Validate that an object is a valid configuration object
 * @param {*} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function isValidConfig(config) {
  return config && typeof config === 'object' && !Array.isArray(config);
}

/**
 * Template service for managing Caddy configuration templates
 */
export default {
  /**
   * Get all available templates
   * @returns {Array} Array of template metadata objects
   */
  getAllTemplates() {
    return [
      reverseProxyTemplate,
      basicWebTemplate, 
      apiGatewayTemplate,
      loadBalancerTemplate,
      staticSiteTemplate,
      emptyTemplate
    ];
  },
  
  /**
   * Get a specific template by its ID
   * @param {String} templateId - The ID of the template to retrieve
   * @returns {Object|null} The template object or null if not found
   */
  getTemplateById(templateId) {
    const allTemplates = this.getAllTemplates();
    return allTemplates.find(template => template.id === templateId) || null;
  },
  
  /**
   * Generate customized configuration JSON based on template and user inputs
   * @param {String} templateId - The template ID
   * @param {Object} customization - User customizations for the template
   * @param {Object} existingConfig - Existing configuration to merge with (optional)
   * @returns {Object} The generated configuration object
   */
  generateConfigFromTemplate(templateId, customization = {}, existingConfig = null) {
    const template = this.getTemplateById(templateId);
    
    if (!template) {
      console.error(`Template with ID ${templateId} not found`);
      return {};
    }
    
    // Validate existing config if provided
    if (existingConfig && !isValidConfig(existingConfig)) {
      console.warn('Invalid existing configuration provided, starting with empty config');
      existingConfig = null;
    }
    
    // Start with the base configuration
    const baseConfig = deepClone(template.config);
    
    // Apply customizations based on the template type
    let customizedConfig;
    switch (templateId) {
      case 'reverse-proxy':
        customizedConfig = this.customizeReverseProxy(baseConfig, customization);
        break;
      case 'api-gateway':
        customizedConfig = this.customizeApiGateway(baseConfig, customization);
        break;
      case 'load-balancer':
        customizedConfig = this.customizeLoadBalancer(baseConfig, customization);
        break;
      case 'basic-web':
        customizedConfig = this.customizeBasicWeb(baseConfig, customization);
        break;
      case 'static-site':
        customizedConfig = this.customizeStaticSite(baseConfig, customization);
        break;
      default:
        customizedConfig = baseConfig;
    }
    
    // If we have an existing configuration, intelligently merge
    if (existingConfig && Object.keys(existingConfig).length > 0) {
      return this.intelligentMergeConfigs(existingConfig, customizedConfig, customization);
    }
    
    return customizedConfig;
  },

  /**
   * Intelligently merge a new template configuration with an existing one
   * Handles domain conflicts by merging routes instead of duplicating servers
   * @param {Object} existingConfig - Current configuration
   * @param {Object} newConfig - New template configuration
   * @param {Object} customization - Template customization parameters
   * @returns {Object} Merged configuration
   */
  intelligentMergeConfigs(existingConfig, newConfig, customization) {
    // Validate inputs
    if (!isValidConfig(existingConfig)) {
      console.warn('Invalid existing config, using new config only');
      return deepClone(newConfig);
    }
    
    if (!isValidConfig(newConfig)) {
      console.warn('Invalid new config, keeping existing config');
      return deepClone(existingConfig);
    }
    
    const merged = deepClone(existingConfig);
    
    // Ensure apps.http.servers exists
    if (!merged.apps) merged.apps = {};
    if (!merged.apps.http) merged.apps.http = {};
    if (!merged.apps.http.servers) merged.apps.http.servers = {};
    
    // Get the new configuration's servers
    const newServers = newConfig?.apps?.http?.servers || {};
    
    for (const [newServerKey, newServerConfig] of Object.entries(newServers)) {
      const newListenAddresses = newServerConfig.listen || [];
      const newRoutes = newServerConfig.routes || [];
      
      // Find existing server with matching listen addresses
      let targetServerKey = null;
      let targetServer = null;
      
      for (const [existingServerKey, existingServerConfig] of Object.entries(merged.apps.http.servers)) {
        const existingListenAddresses = existingServerConfig.listen || [];
        
        // Check if listen addresses overlap
        const hasOverlap = newListenAddresses.some(addr => 
          existingListenAddresses.includes(addr)
        );
        
        if (hasOverlap) {
          targetServerKey = existingServerKey;
          targetServer = existingServerConfig;
          break;
        }
      }
      
      if (targetServer) {
        // Merge routes into existing server
        this.mergeRoutesIntoServer(targetServer, newRoutes, customization);
      } else {
        // No conflicting server found, add as new server
        merged.apps.http.servers[newServerKey] = newServerConfig;
      }
    }
    
    // Merge other top-level configs (admin, logging, etc.) if they don't exist
    if (newConfig.admin && !merged.admin) {
      merged.admin = newConfig.admin;
    }
    
    if (newConfig.logging && !merged.logging) {
      merged.logging = newConfig.logging;
    }
    
    return merged;
  },

  /**
   * Merge new routes into an existing server, handling domain conflicts intelligently
   * @param {Object} existingServer - Target server configuration
   * @param {Array} newRoutes - Routes to merge
   * @param {Object} customization - Template customization for context
   */
  mergeRoutesIntoServer(existingServer, newRoutes, customization) {
    if (!existingServer.routes) existingServer.routes = [];
    
    for (const newRoute of newRoutes) {
      const newHosts = this.extractHostsFromRoute(newRoute);
      const newPaths = this.extractPathsFromRoute(newRoute);
      
      // Check if we have a conflicting route (same host and path)
      const conflictingRouteIndex = existingServer.routes.findIndex(existingRoute => {
        const existingHosts = this.extractHostsFromRoute(existingRoute);
        const existingPaths = this.extractPathsFromRoute(existingRoute);
        
        // Check for host overlap
        const hostOverlap = newHosts.some(host => 
          existingHosts.some(existingHost => 
            this.domainsConflict(host, existingHost)
          )
        );
        
        // Check for path overlap (if both have paths)
        const pathOverlap = newPaths.length === 0 || existingPaths.length === 0 || 
          newPaths.some(path => existingPaths.includes(path));
        
        return hostOverlap && pathOverlap;
      });
      
      if (conflictingRouteIndex >= 0) {
        // We have a conflict - merge or replace the route
        const existingRoute = existingServer.routes[conflictingRouteIndex];
        
        // If the new route has a more specific path, add it before the existing route
        if (newPaths.length > 0 && this.extractPathsFromRoute(existingRoute).length === 0) {
          existingServer.routes.splice(conflictingRouteIndex, 0, newRoute);
        } else {
          // Replace the existing route with better error handling
          console.warn(`Replacing existing route for hosts: ${newHosts.join(', ')}`);
          existingServer.routes[conflictingRouteIndex] = newRoute;
        }
      } else {
        // No conflict, add the route
        // Insert more specific routes (with paths) before general routes
        if (newPaths.length > 0) {
          // Find the right position to insert (before less specific routes)
          const insertIndex = existingServer.routes.findIndex(route => 
            this.extractPathsFromRoute(route).length === 0
          );
          
          if (insertIndex >= 0) {
            existingServer.routes.splice(insertIndex, 0, newRoute);
          } else {
            existingServer.routes.push(newRoute);
          }
        } else {
          existingServer.routes.push(newRoute);
        }
      }
    }
  },

  /**
   * Extract host patterns from a route's match conditions
   * @param {Object} route - Caddy route object
   * @returns {Array} Array of host patterns
   */
  extractHostsFromRoute(route) {
    const hosts = [];
    if (route.match && Array.isArray(route.match)) {
      for (const matcher of route.match) {
        if (matcher.host && Array.isArray(matcher.host)) {
          hosts.push(...matcher.host);
        }
      }
    }
    return hosts;
  },

  /**
   * Extract path patterns from a route's match conditions
   * @param {Object} route - Caddy route object
   * @returns {Array} Array of path patterns
   */
  extractPathsFromRoute(route) {
    const paths = [];
    if (route.match && Array.isArray(route.match)) {
      for (const matcher of route.match) {
        if (matcher.path && Array.isArray(matcher.path)) {
          paths.push(...matcher.path);
        }
      }
    }
    return paths;
  },

  /**
   * Check if two domain patterns conflict (same domain or subdomain relationship)
   * @param {String} domain1 - First domain pattern
   * @param {String} domain2 - Second domain pattern
   * @returns {Boolean} True if domains conflict
   */
  domainsConflict(domain1, domain2) {
    // Exact match
    if (domain1 === domain2) return true;
    
    // Wildcard patterns
    if (domain1.startsWith('*.') || domain2.startsWith('*.')) {
      const base1 = domain1.startsWith('*.') ? domain1.slice(2) : domain1;
      const base2 = domain2.startsWith('*.') ? domain2.slice(2) : domain2;
      
      // Check if one is a subdomain of the other
      return base1 === base2 || 
             domain1.endsWith('.' + base2) || 
             domain2.endsWith('.' + base1);
    }
    
    // Check subdomain relationship
    return domain1.endsWith('.' + domain2) || domain2.endsWith('.' + domain1);
  },
  
  /**
   * Customize the reverse proxy template
   * @param {Object} baseConfig - Base configuration object
   * @param {Object} customization - User customizations
   * @returns {Object} Customized configuration
   */
  customizeReverseProxy(baseConfig, customization) {
    const config = deepClone(baseConfig);
    const serverKey = Object.keys(config.apps.http.servers)[0];
    
    // Set the hostname
    if (customization.host) {
      config.apps.http.servers[serverKey].routes[0].match[0].host = [customization.host];
    }
    
    // Set the listen address
    if (customization.listen) {
      config.apps.http.servers[serverKey].listen = [customization.listen];
    }
    
    // Set upstream targets
    if (customization.upstreams) {
      const upstreams = Array.isArray(customization.upstreams) 
        ? customization.upstreams 
        : customization.upstreams.split('\n').filter(line => line.trim());
        
      config.apps.http.servers[serverKey].routes[0].handle[0].upstreams = 
        upstreams.map(target => ({ dial: target.trim() }));
    }
    
    // Set path prefix
    if (customization.pathPrefix && customization.pathPrefix.trim()) {
      // Ensure the match array exists and has the first matcher
      if (!config.apps.http.servers[serverKey].routes[0].match) {
        config.apps.http.servers[serverKey].routes[0].match = [{}];
      }
      if (!config.apps.http.servers[serverKey].routes[0].match[0]) {
        config.apps.http.servers[serverKey].routes[0].match[0] = {};
      }
      
      config.apps.http.servers[serverKey].routes[0].match[0].path = [customization.pathPrefix.trim()];
    }
    
    // Set load balancing policy
    if (customization.loadBalancing) {
      config.apps.http.servers[serverKey].routes[0].handle[0].lb_policy = customization.loadBalancing;
    }
    
    return config;
  },
  
  /**
   * Customize the API gateway template
   * @param {Object} baseConfig - Base configuration object
   * @param {Object} customization - User customizations
   * @returns {Object} Customized configuration
   */
  customizeApiGateway(baseConfig, customization) {
    const config = deepClone(baseConfig);
    const serverKey = Object.keys(config.apps.http.servers)[0];
    
    // Set API domain
    if (customization.apiDomain) {
      // Update all routes with the new domain
      config.apps.http.servers[serverKey].routes.forEach(route => {
        if (route.match && route.match[0] && route.match[0].host) {
          route.match[0].host = [customization.apiDomain];
        }
      });
    }
    
    // Set listen address
    if (customization.listen) {
      config.apps.http.servers[serverKey].listen = [customization.listen];
    }
    
    // Set service routes
    if (customization.services) {
      const serviceRoutes = Array.isArray(customization.services) 
        ? customization.services 
        : customization.services.split('\n').filter(line => line.trim() && line.includes('='));
      
      // Create routes from the service definitions
      const routes = serviceRoutes.map(routeDef => {
        const [path, upstream] = routeDef.split('=').map(part => part.trim());
        
        return {
          match: [{ 
            host: [customization.apiDomain || "api.example.com"],
            path: [path] 
          }],
          handle: [{ 
            handler: "reverse_proxy",
            upstreams: [{ dial: upstream }]
          }],
          terminal: true
        };
      });
      
      // Replace existing routes with our new ones
      if (routes.length > 0) {
        config.apps.http.servers[serverKey].routes = routes;
      }
    }
    
    // Add JWT authentication if enabled
    if (customization.enableJwt) {
      // Add JWT authentication to each route
      config.apps.http.servers[serverKey].routes.forEach(route => {
        route.handle.unshift({
          handler: "authentication",
          providers: {
            jwt: {
              issuer: "auth-service",
              validate_exp: true
            }
          }
        });
      });
    }
    
    return config;
  },
  
  /**
   * Customize the load balancer template
   * @param {Object} baseConfig - Base configuration object
   * @param {Object} customization - User customizations
   * @returns {Object} Customized configuration
   */
  customizeLoadBalancer(baseConfig, customization) {
    const config = deepClone(baseConfig);
    const serverKey = Object.keys(config.apps.http.servers)[0];
    
    // Set hostname
    if (customization.host) {
      config.apps.http.servers[serverKey].routes[0].match[0].host = [customization.host];
    }
    
    // Set listen address
    if (customization.listen) {
      config.apps.http.servers[serverKey].listen = [customization.listen];
    }
    
    // Set backend servers
    if (customization.backends) {
      const backends = Array.isArray(customization.backends) 
        ? customization.backends 
        : customization.backends.split('\n').filter(line => line.trim());
        
      config.apps.http.servers[serverKey].routes[0].handle[0].upstreams = 
        backends.map(server => ({ dial: server.trim() }));
    }
    
    // Set load balancing policy
    if (customization.lbPolicy) {
      config.apps.http.servers[serverKey].routes[0].handle[0].lb_policy = customization.lbPolicy;
    }
    
    // Set health checks if enabled
    if (customization.enableHealthChecks) {
      config.apps.http.servers[serverKey].routes[0].handle[0].health_checks = {
        active: {
          path: customization.healthCheckPath || "/health",
          interval: customization.healthCheckInterval || "30s",
          timeout: customization.healthCheckTimeout || "5s"
        }
      };
    }
    
    return config;
  },
  
  /**
   * Customize the basic web server template
   * @param {Object} baseConfig - Base configuration object
   * @param {Object} customization - User customizations
   * @returns {Object} Customized configuration
   */
  customizeBasicWeb(baseConfig, customization) {
    const config = deepClone(baseConfig);
    const serverKey = Object.keys(config.apps.http.servers)[0];
    
    // Set hostname if provided
    if (customization.host) {
      // Make sure we have a match section
      if (!config.apps.http.servers[serverKey].routes[0].match) {
        config.apps.http.servers[serverKey].routes[0].match = [{ host: [customization.host] }];
      } else {
        config.apps.http.servers[serverKey].routes[0].match[0].host = [customization.host];
      }
    }
    
    // Set listen address
    if (customization.listen) {
      config.apps.http.servers[serverKey].listen = [customization.listen];
    }
    
    // Set root directory
    if (customization.rootDir) {
      config.apps.http.servers[serverKey].routes[0].handle[0].root = customization.rootDir;
    }
    
    // Set index files
    if (customization.indexFiles) {
      const indexFiles = Array.isArray(customization.indexFiles) 
        ? customization.indexFiles 
        : customization.indexFiles.split(',').map(file => file.trim());
        
      config.apps.http.servers[serverKey].routes[0].handle[0].index_names = indexFiles;
    }
    
    // Enable directory listing
    if (customization.enableBrowse) {
      config.apps.http.servers[serverKey].routes[0].handle[0].browse = true;
    }
    
    return config;
  },
  
  /**
   * Customize the static site template
   * @param {Object} baseConfig - Base configuration object
   * @param {Object} customization - User customizations
   * @returns {Object} Customized configuration
   */
  customizeStaticSite(baseConfig, customization) {
    const config = deepClone(baseConfig);
    const serverKey = Object.keys(config.apps.http.servers)[0];
    
    // Set hostname
    if (customization.host) {
      config.apps.http.servers[serverKey].routes[0].match[0].host = [customization.host];
    }
    
    // Set listen address
    if (customization.listen) {
      config.apps.http.servers[serverKey].listen = [customization.listen];
    }
    
    // Set root directory
    if (customization.rootDir) {
      config.apps.http.servers[serverKey].routes[0].handle[0].root = customization.rootDir;
    }
    
    // Configure caching options
    if (customization.cacheControl) {
      if (!config.apps.cache) {
        config.apps.cache = { http: { default_cache_control: customization.cacheControl } };
      } else {
        config.apps.cache.http.default_cache_control = customization.cacheControl;
      }
    }
    
    // Configure compression
    if (customization.enableCompression) {
      // Check if there's already a compress handler
      const hasCompressHandler = config.apps.http.servers[serverKey].routes[0].handle
        .some(handler => handler.handler === 'encode');
        
      if (!hasCompressHandler) {
        // Add compress handler after file_server handler
        config.apps.http.servers[serverKey].routes[0].handle.push({
          handler: "encode",
          encodings: {
            gzip: {},
            zstd: {}
          }
        });
      }
    }
    
    return config;
  }
};