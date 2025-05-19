import Fuse from 'fuse.js';
import { useCaddyConfigsStore } from '../stores/caddyConfigsStore';
import { useCaddyServersStore } from '../stores/caddyServersStore';
import swaggerService from './swaggerService';

/**
 * Comprehensive search service with fuzzy matching capabilities
 * Searches across:
 * - Caddy configurations
 * - Caddy servers
 * - API endpoints
 */
class SearchService {
  constructor() {
    this._configsStore = null;
    this._serversStore = null;
    this._apiEndpoints = [];
    this._isInitialized = false;
    this._fuseOptions = {
      // Default Fuse.js options for fuzzy searching
      isCaseSensitive: false,
      includeScore: true,
      shouldSort: true,
      includeMatches: true,
      threshold: 0.4,
      location: 0,
      distance: 100,
      minMatchCharLength: 2,
    };
  }

  /**
   * Initialize the search service
   * This needs to be called after the app has mounted
   */
  async initialize() {
    if (this._isInitialized) return;

    // Initialize store references
    this._configsStore = useCaddyConfigsStore();
    this._serversStore = useCaddyServersStore();

    // Ensure stores are initialized
    if (!this._configsStore.isInitialized) {
      await this._configsStore.initialize();
    }
    
    // Load servers if not already loaded
    if (this._serversStore.servers.length === 0) {
      await this._serversStore.fetchServers();
    }

    // Initialize API endpoints from Swagger
    try {
      const endpointsByTag = await swaggerService.getEndpointsByTag();
      this._apiEndpoints = [];
      
      // Flatten endpoints by tag into a single array
      Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
        endpoints.forEach(endpoint => {
          this._apiEndpoints.push({
            ...endpoint,
            tag,
            id: `api-${endpoint.method}-${endpoint.path}`,
            type: 'api'
          });
        });
      });
    } catch (error) {
      console.error('Failed to load API endpoints for search:', error);
      this._apiEndpoints = [];
    }

    this._isInitialized = true;
    return true;
  }

  /**
   * Get all searchable items from all data sources
   * @returns {Array} All searchable items
   */
  _getAllSearchableItems() {
    const items = [];

    // Add configurations
    if (this._configsStore) {
      this._configsStore.configs.forEach(config => {
        items.push({
          id: `config-${config._id}`,
          title: config.name || 'Unnamed Config',
          description: config.description || '',
          type: 'config',
          path: `/configs/${config._id}`,
          icon: 'DocumentTextIcon',
          rawData: config
        });
      });
    }

    // Add servers
    if (this._serversStore) {
      this._serversStore.servers.forEach(server => {
        // Fix the description to prevent "undefined:undefined"
        let serverDescription = server.description;
        if (!serverDescription || serverDescription.trim() === '') {
          // Use apiUrl and apiPort if description is empty
          serverDescription = server.apiUrl ? 
            `${server.apiUrl}${server.apiPort ? `:${server.apiPort}` : ''}` : 
            `Server ID: ${server._id.substring(0, 8)}...`;
        }
        
        items.push({
          id: `server-${server._id}`,
          title: server.name || 'Unnamed Server',
          description: serverDescription,
          type: 'server',
          path: `/servers/${server._id}`,
          icon: 'ServerIcon',
          status: server.status,
          rawData: server
        });
      });
    }

    // Add API endpoints
    this._apiEndpoints.forEach(endpoint => {
      items.push({
        id: endpoint.id,
        title: `${endpoint.method} ${endpoint.path}`,
        description: endpoint.summary || endpoint.description || '',
        type: 'api',
        category: endpoint.tag,
        path: '/apikeys?tab=docs',
        icon: 'CodeBracketIcon',
        rawData: endpoint
      });
    });

    return items;
  }

  /**
   * Search across all data sources
   * @param {string} query - Search query string
   * @param {Object} options - Search options
   * @param {Array} options.types - Types of items to search ('config', 'server', 'api')
   * @param {number} options.limit - Maximum number of results to return
   * @returns {Array} Search results
   */
  search(query, options = {}) {
    if (!this._isInitialized) {
      console.warn('Search service not initialized. Call initialize() first.');
      return [];
    }

    if (!query || query.trim() === '') {
      return [];
    }

    // Get all items
    let items = this._getAllSearchableItems();
    
    // Apply type filters if provided
    if (options.types && Array.isArray(options.types) && options.types.length > 0) {
      items = items.filter(item => options.types.includes(item.type));
    }

    // Configure Fuse with item-specific keys
    const fuse = new Fuse(items, {
      ...this._fuseOptions,
      keys: [
        { name: 'title', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'type', weight: 0.5 },
        { name: 'category', weight: 0.5 }
      ]
    });

    // Perform the search
    const results = fuse.search(query);
    
    // Map results to a cleaner format
    const mappedResults = results.map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches
    }));

    // Apply limit if provided
    if (options.limit && typeof options.limit === 'number') {
      return mappedResults.slice(0, options.limit);
    }

    return mappedResults;
  }

  /**
   * Group search results by type
   * @param {Array} results - Search results from search()
   * @returns {Object} Results grouped by type
   */
  groupResultsByType(results) {
    const grouped = {
      config: [],
      server: [],
      api: []
    };

    results.forEach(result => {
      if (grouped[result.type]) {
        grouped[result.type].push(result);
      } else {
        grouped[result.type] = [result];
      }
    });

    return grouped;
  }

  /**
   * Navigate to a search result
   * @param {Object} result - Search result item
   * @param {Object} router - Vue Router instance
   */
  navigateToResult(result, router) {
    if (!result || !result.path) return;
    
    // For API endpoints, navigate to API docs tab
    if (result.type === 'api') {
      router.push({ path: '/apikeys', query: { tab: 'docs', highlight: result.id } });
      return;
    }

    // For configs and servers, navigate directly
    router.push(result.path);
  }
}

// Create singleton instance
const searchService = new SearchService();

export default searchService;