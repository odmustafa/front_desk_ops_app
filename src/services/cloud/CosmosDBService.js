/**
 * CosmosDBService.js
 * Handles integration with Azure CosmosDB
 */
const { CosmosClient } = require('@azure/cosmos');
const Logger = require('../../core/Logger');
const Settings = require('../../core/Settings');

class CosmosDBService {
  constructor() {
    const LoggerService = require('../services/LoggerService');
    this.logger = new LoggerService('CosmosDBService');
    this.settings = new Settings();
    this.client = null;
    this.database = null;
    this.containers = {};
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize the CosmosDB service
   */
  async initialize() {
    try {
      const settings = this.settings.getSettings();
      
      // Check for required settings
      if (!settings.cosmosEndpoint || !settings.cosmosKey || !settings.cosmosDatabase) {
        this.logger.warn('CosmosDB credentials not configured');
        return;
      }
      
      // Create CosmosDB client
      this.client = new CosmosClient({
        endpoint: settings.cosmosEndpoint,
        key: settings.cosmosKey
      });
      
      // Get database reference
      const databaseId = settings.cosmosDatabase;
      this.database = this.client.database(databaseId);
      
      // Initialize default containers
      await this._initializeContainers();
      
      this.initialized = true;
      this.logger.info('CosmosDB service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize CosmosDB service', { error: error.message });
    }
  }

  /**
   * Initialize containers
   * @private
   */
  async _initializeContainers() {
    try {
      // Define required containers with partition keys
      const requiredContainers = [
        { id: 'members', partitionKey: '/id' },
        { id: 'staff', partitionKey: '/id' },
        { id: 'incidents', partitionKey: '/id' },
        { id: 'announcements', partitionKey: '/id' },
        { id: 'check_ins', partitionKey: '/id' },
        { id: 'knowledge_base', partitionKey: '/id' }
      ];
      
      // Get existing containers
      const { resources: containersList } = await this.database.containers.readAll().fetchAll();
      const existingContainers = containersList.map(container => container.id);
      
      // Create containers if they don't exist
      for (const container of requiredContainers) {
        if (!existingContainers.includes(container.id)) {
          this.logger.info(`Creating container: ${container.id}`);
          await this.database.containers.create({
            id: container.id,
            partitionKey: { paths: [container.partitionKey] }
          });
        }
        
        // Store container reference
        this.containers[container.id] = this.database.container(container.id);
      }
      
      this.logger.info('CosmosDB containers initialized');
    } catch (error) {
      this.logger.error('Error initializing CosmosDB containers', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   * @returns {boolean} Initialization status
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      this.logger.warn('CosmosDB service not initialized');
      return false;
    }
    return true;
  }

  /**
   * Test connection to CosmosDB
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      if (!this._checkInitialized()) {
        return { 
          success: false, 
          error: 'CosmosDB service not initialized' 
        };
      }
      
      // Try to get database info
      const databaseInfo = await this.database.read();
      
      // Get container list
      const { resources: containersList } = await this.database.containers.readAll().fetchAll();
      
      this.logger.info('CosmosDB connection successful');
      return { 
        success: true,
        data: {
          database: databaseInfo.id,
          containers: containersList.map(container => container.id)
        }
      };
    } catch (error) {
      this.logger.error('Error testing CosmosDB connection', { error: error.message });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Create an item in a container
   * @param {string} containerId - Container ID
   * @param {Object} item - Item to create
   * @returns {Promise<Object>} Create result
   */
  async createItem(containerId, item) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      // Create item
      const { resource: createdItem } = await this.containers[containerId].items.create(item);
      
      this.logger.info('Item created in CosmosDB', { 
        containerId,
        id: createdItem.id
      });
      
      return { 
        success: true,
        data: createdItem
      };
    } catch (error) {
      this.logger.error('Error creating item in CosmosDB', { 
        error: error.message,
        containerId
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Read an item from a container
   * @param {string} containerId - Container ID
   * @param {string} id - Item ID
   * @param {string} partitionKey - Partition key value
   * @returns {Promise<Object>} Read result
   */
  async readItem(containerId, id, partitionKey) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      // Read item
      const { resource: item } = await this.containers[containerId].item(id, partitionKey).read();
      
      this.logger.info('Item read from CosmosDB', { 
        containerId,
        id
      });
      
      return { 
        success: true,
        data: item
      };
    } catch (error) {
      // If item not found, return null data instead of error
      if (error.code === 404) {
        this.logger.debug('Item not found in CosmosDB', { 
          containerId,
          id
        });
        return { 
          success: true,
          data: null
        };
      }
      
      this.logger.error('Error reading item from CosmosDB', { 
        error: error.message,
        containerId,
        id
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Update an item in a container
   * @param {string} containerId - Container ID
   * @param {string} id - Item ID
   * @param {Object} item - Updated item
   * @param {string} partitionKey - Partition key value
   * @returns {Promise<Object>} Update result
   */
  async updateItem(containerId, id, item, partitionKey) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      // Ensure item has ID
      item.id = id;
      
      // Update item
      const { resource: updatedItem } = await this.containers[containerId].item(id, partitionKey).replace(item);
      
      this.logger.info('Item updated in CosmosDB', { 
        containerId,
        id
      });
      
      return { 
        success: true,
        data: updatedItem
      };
    } catch (error) {
      this.logger.error('Error updating item in CosmosDB', { 
        error: error.message,
        containerId,
        id
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Delete an item from a container
   * @param {string} containerId - Container ID
   * @param {string} id - Item ID
   * @param {string} partitionKey - Partition key value
   * @returns {Promise<Object>} Delete result
   */
  async deleteItem(containerId, id, partitionKey) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      // Delete item
      await this.containers[containerId].item(id, partitionKey).delete();
      
      this.logger.info('Item deleted from CosmosDB', { 
        containerId,
        id
      });
      
      return { 
        success: true
      };
    } catch (error) {
      this.logger.error('Error deleting item from CosmosDB', { 
        error: error.message,
        containerId,
        id
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Query items in a container
   * @param {string} containerId - Container ID
   * @param {string} query - SQL query
   * @param {Array} parameters - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async queryItems(containerId, query, parameters = []) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      // Create query parameters object
      const queryParameters = parameters.map((param, index) => ({
        name: `@param${index}`,
        value: param
      }));
      
      // Update query to use parameters
      let parameterizedQuery = query;
      queryParameters.forEach((param, index) => {
        parameterizedQuery = parameterizedQuery.replace(`?`, param.name);
      });
      
      // Query items
      const querySpec = {
        query: parameterizedQuery,
        parameters: queryParameters
      };
      
      const { resources: items } = await this.containers[containerId].items.query(querySpec).fetchAll();
      
      this.logger.info('Items queried from CosmosDB', { 
        containerId,
        count: items.length
      });
      
      return { 
        success: true,
        data: items
      };
    } catch (error) {
      this.logger.error('Error querying items from CosmosDB', { 
        error: error.message,
        containerId,
        query
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Bulk create items in a container
   * @param {string} containerId - Container ID
   * @param {Array} items - Items to create
   * @returns {Promise<Object>} Bulk create result
   */
  async bulkCreateItems(containerId, items) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      // Create items in batches of 100
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(item => this.containers[containerId].items.create(item));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push({
              success: true,
              id: result.value.resource.id,
              item: batch[index]
            });
          } else {
            results.push({
              success: false,
              error: result.reason.message,
              item: batch[index]
            });
          }
        });
      }
      
      const successCount = results.filter(result => result.success).length;
      
      this.logger.info('Bulk items created in CosmosDB', { 
        containerId,
        total: items.length,
        success: successCount,
        failed: items.length - successCount
      });
      
      return { 
        success: true,
        data: {
          results,
          total: items.length,
          success: successCount,
          failed: items.length - successCount
        }
      };
    } catch (error) {
      this.logger.error('Error bulk creating items in CosmosDB', { 
        error: error.message,
        containerId
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Sync local data to CosmosDB
   * @param {string} containerId - Container ID
   * @param {Array} items - Items to sync
   * @param {Function} idMapper - Function to map local ID to CosmosDB ID
   * @returns {Promise<Object>} Sync result
   */
  async syncItems(containerId, items, idMapper = (item) => item.id || item._id) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'CosmosDB service not initialized' };
      }
      
      if (!this.containers[containerId]) {
        this.logger.error('Container not found', { containerId });
        return { success: false, error: `Container not found: ${containerId}` };
      }
      
      const results = {
        created: [],
        updated: [],
        failed: []
      };
      
      // Process items one by one to handle errors better
      for (const item of items) {
        try {
          const id = idMapper(item);
          
          if (!id) {
            results.failed.push({
              item,
              error: 'Missing ID'
            });
            continue;
          }
          
          // Check if item exists
          const existingItem = await this.readItem(containerId, id, id);
          
          if (!existingItem.data) {
            // Create new item
            const createResult = await this.createItem(containerId, {
              ...item,
              id
            });
            
            if (createResult.success) {
              results.created.push(createResult.data);
            } else {
              results.failed.push({
                item,
                error: createResult.error
              });
            }
          } else {
            // Update existing item
            const updateResult = await this.updateItem(containerId, id, {
              ...existingItem.data,
              ...item,
              id
            }, id);
            
            if (updateResult.success) {
              results.updated.push(updateResult.data);
            } else {
              results.failed.push({
                item,
                error: updateResult.error
              });
            }
          }
        } catch (itemError) {
          results.failed.push({
            item,
            error: itemError.message
          });
        }
      }
      
      this.logger.info('Items synced to CosmosDB', { 
        containerId,
        created: results.created.length,
        updated: results.updated.length,
        failed: results.failed.length
      });
      
      return { 
        success: true,
        data: results
      };
    } catch (error) {
      this.logger.error('Error syncing items to CosmosDB', { 
        error: error.message,
        containerId
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

module.exports = CosmosDBService;
