/**
 * SeqLogger.js
 * Handles sending logs to a Seq server
 */
const axios = require('axios');
const os = require('os');
const { app } = require('electron');
const LoggerService = require('./logger-service'); // Import LoggerService

// Ensure API logger is initialized
require('./api-logger');

class SeqLogger {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:5341';
    this.apiKey = options.apiKey || '';
    this.batchSize = options.batchSize || 10;
    this.batchTimeoutMs = options.batchTimeoutMs || 2000;
    this.enabled = options.enabled !== false;
    this.appName = options.appName || 'FrontDeskOps';
    this.minLevel = options.minLevel || 'debug';
    
    // Batch handling
    this.logBatch = [];
    this.batchTimeout = null;
    
    // Connection status
    this.connectionStatus = {
      connected: false,
      lastChecked: null,
      lastError: null,
      checkInProgress: false
    };
    
    // System information
    this.systemInfo = {
      hostname: os.hostname(),
      platform: process.platform,
      arch: process.arch,
      appVersion: app.getVersion(),
      nodeVersion: process.version
    };
    
    // Log level mapping
    this.logLevels = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5
    };
    
    // Check connection on startup if enabled
    if (this.enabled) {
      this.checkConnection();
    }
  }

  /**
   * Log a message to Seq
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} properties - Additional properties
   */
  log(level, message, properties = {}) {
    if (!this.enabled) return;
    
    // Check minimum log level
    if (this.logLevels[level] < this.logLevels[this.minLevel]) {
      return;
    }
    
    // Clean properties to avoid circular references
    const cleanProperties = {};
    try {
      // Only include primitive values and simple objects
      Object.keys(properties).forEach(key => {
        if (typeof properties[key] !== 'function' && key !== 'error') {
          if (typeof properties[key] === 'object' && properties[key] !== null) {
            try {
              // Test if it can be stringified
              JSON.stringify(properties[key]);
              cleanProperties[key] = properties[key];
            } catch (e) {
              // If it can't be stringified, convert to string
              cleanProperties[key] = String(properties[key]);
            }
          } else {
            cleanProperties[key] = properties[key];
          }
        }
      });
    } catch (e) {
      LoggerService.error('Error cleaning properties for Seq:', e);
    }
    
    // Format error if present
    let exceptionText = undefined;
    if (properties.error) {
      if (typeof properties.error === 'string') {
        exceptionText = properties.error;
      } else if (properties.error instanceof Error) {
        exceptionText = `${properties.error.name}: ${properties.error.message}\n${properties.error.stack || ''}`;
      } else {
        try {
          exceptionText = JSON.stringify(properties.error);
        } catch (e) {
          exceptionText = String(properties.error);
        }
      }
    }
    
    // Create log event
    const logEvent = {
      '@t': new Date().toISOString(),
      '@l': level.toUpperCase(),
      '@m': message,
      '@x': exceptionText,
      'Application': this.appName,
      'MachineName': this.systemInfo.hostname,
      'Platform': this.systemInfo.platform,
      'AppVersion': this.systemInfo.appVersion,
      ...cleanProperties
    };
    
    // Add to batch
    this.logBatch.push(logEvent);
    
    // Send batch if it's full
    if (this.logBatch.length >= this.batchSize) {
      this._sendBatch();
    } else if (!this.batchTimeout) {
      // Start timeout to send batch
      this.batchTimeout = setTimeout(() => this._sendBatch(), this.batchTimeoutMs);
    }
  }

  /**
   * Send batch of logs to Seq
   * @private
   */
  _sendBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    if (this.logBatch.length === 0) return;
    
    const batch = [...this.logBatch];
    this.logBatch = [];
    
    // Send to Seq
    this._sendToSeq(batch).catch(error => {
      LoggerService.error('Error sending logs to Seq:', error.message);
    });
  }

  /**
   * Send logs to Seq server
   * @param {Array} events - Log events
   * @private
   */
  async _sendToSeq(events) {
    try {
      const headers = {
        'Content-Type': 'application/vnd.serilog.clef'
      };
      
      if (this.apiKey) {
        headers['X-Seq-ApiKey'] = this.apiKey;
      }
      
      LoggerService.debug('Sending logs to Seq:', headers);
      
      // Format events as CLEF format (Compact Log Event Format)
      // Each event must be a separate line
      const clefData = events.map(event => JSON.stringify(event)).join('\n');
      
      await axios({
        method: 'post',
        url: `${this.url}/api/events/raw`,
        headers,
        data: clefData,
        timeout: 5000
      });
      
      LoggerService.info(`Successfully sent ${events.length} logs to Seq`);
      
      // Update connection status on successful send
      if (!this.connectionStatus.connected) {
        this.connectionStatus.connected = true;
        this.connectionStatus.lastChecked = new Date();
        this.connectionStatus.lastError = null;
      }
    } catch (error) {
      LoggerService.error('Failed to send logs to Seq:', error.message);
      
      // Update connection status on failure
      this.connectionStatus.connected = false;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError = error.message;
      
      throw error;
    }
  }

  /**
   * Flush pending logs
   */
  flush() {
    if (this.logBatch.length > 0) {
      this._sendBatch();
    }
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} properties - Additional properties
   */
  debug(message, properties = {}) {
    this.log('debug', message, properties);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} properties - Additional properties
   */
  info(message, properties = {}) {
    this.log('info', message, properties);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} properties - Additional properties
   */
  warn(message, properties = {}) {
    this.log('warn', message, properties);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} properties - Additional properties
   */
  error(message, properties = {}) {
    this.log('error', message, properties);
  }

  /**
   * Log fatal message
   * @param {string} message - Log message
   * @param {Object} properties - Additional properties
   */
  fatal(message, properties = {}) {
    this.log('fatal', message, properties);
  }
  
  /**
   * Check connection to Seq server
   * @returns {Promise<Object>} Connection status
   */
  async checkConnection() {
    if (!this.enabled) {
      return {
        connected: false,
        enabled: false,
        message: 'Seq logging is disabled'
      };
    }
    
    // Prevent multiple simultaneous checks
    if (this.connectionStatus.checkInProgress) {
      return {
        ...this.connectionStatus,
        message: 'Connection check already in progress'
      };
    }
    
    this.connectionStatus.checkInProgress = true;
    
    try {
      const headers = {
        'Accept': 'application/json'
      };
      
      if (this.apiKey) {
        headers['X-Seq-ApiKey'] = this.apiKey;
      }
      
      // Use a simple API endpoint to check connection
      const response = await axios({
        method: 'get',
        url: `${this.url}/api`,
        headers,
        timeout: 5000
      });
      
      this.connectionStatus.connected = response.status === 200;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError = null;
      this.connectionStatus.checkInProgress = false;
      
      return {
        connected: this.connectionStatus.connected,
        enabled: this.enabled,
        url: this.url,
        lastChecked: this.connectionStatus.lastChecked,
        message: 'Connection successful'
      };
    } catch (error) {
      this.connectionStatus.connected = false;
      this.connectionStatus.lastChecked = new Date();
      this.connectionStatus.lastError = error.message;
      this.connectionStatus.checkInProgress = false;
      
      return {
        connected: false,
        enabled: this.enabled,
        url: this.url,
        lastChecked: this.connectionStatus.lastChecked,
        error: error.message,
        message: 'Connection failed'
      };
    }
  }
  
  /**
   * Get current connection status
   * @returns {Object} Connection status
   */
  getConnectionStatus() {
    return {
      connected: this.connectionStatus.connected,
      enabled: this.enabled,
      url: this.url,
      lastChecked: this.connectionStatus.lastChecked,
      lastError: this.connectionStatus.lastError
    };
  }
}

module.exports = SeqLogger;
