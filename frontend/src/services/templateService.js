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
   * @returns {Object} The generated configuration object
   */
  generateConfigFromTemplate(templateId, customization = {}) {
    const template = this.getTemplateById(templateId);
    
    if (!template) {
      console.error(`Template with ID ${templateId} not found`);
      return {};
    }
    
    // Start with the base configuration
    const baseConfig = structuredClone(template.config);
    
    // Apply customizations based on the template type
    switch (templateId) {
      case 'reverse-proxy':
        return this.customizeReverseProxy(baseConfig, customization);
      case 'api-gateway':
        return this.customizeApiGateway(baseConfig, customization);
      case 'load-balancer':
        return this.customizeLoadBalancer(baseConfig, customization);
      case 'basic-web':
        return this.customizeBasicWeb(baseConfig, customization);
      case 'static-site':
        return this.customizeStaticSite(baseConfig, customization);
      default:
        return baseConfig;
    }
  },
  
  /**
   * Customize the reverse proxy template
   * @param {Object} baseConfig - Base configuration object
   * @param {Object} customization - User customizations
   * @returns {Object} Customized configuration
   */
  customizeReverseProxy(baseConfig, customization) {
    const config = structuredClone(baseConfig);
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
    if (customization.pathPrefix) {
      config.apps.http.servers[serverKey].routes[0].match[0].path = [customization.pathPrefix];
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
    const config = structuredClone(baseConfig);
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
    const config = structuredClone(baseConfig);
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
    const config = structuredClone(baseConfig);
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
    const config = structuredClone(baseConfig);
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