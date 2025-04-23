/**
 * ConnectionManager.js
 * Manages connections to external services (Wix, TimeXpress, Scan-ID, Database, Seq)
 */
const fs = require('fs');
const path = require('path');
const Logger = require('./Logger');
const PlatformHelper = require('../utils/PlatformHelper');
const Settings = require('./Settings');
const EventEmitter = require('events');
const SeqLogger = require('../utils/SeqLogger');

// Connection status constants
const CONNECTION_STATUS = {
  UNKNOWN: 'unknown',
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected'
};

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.logger = new LoggerService('ConnectionManager');
    this.platform = new PlatformHelper();
    this.settings = new Settings();
    
    this.state = {
      wix: CONNECTION_STATUS.UNKNOWN,
      timeXpress: CONNECTION_STATUS.UNKNOWN,
      scanID: CONNECTION_STATUS.UNKNOWN,
      database: CONNECTION_STATUS.UNKNOWN,
      seq: CONNECTION_STATUS.UNKNOWN,
      lastUpdated: null
    };
    
    // Check status every 30 seconds
    this.checkInterval = 30000;
    this.intervalId = null;
  }
  
  /**
   * Start connection monitoring
   */
  startMonitoring() {
    this.logger.info('Starting connection monitoring');
    this.checkAllConnections();
    
    this.intervalId = setInterval(() => {
      this.checkAllConnections();
    }, this.checkInterval);
  }
  
  /**
   * Stop connection monitoring
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Check all connections
   */
  async checkAllConnections() {
    try {
      await this.checkWixConnection();
      await this.checkTimeXpressConnection();
      await this.checkScanIDConnection();
      await this.checkDatabaseConnection();
      await this.checkSeqConnection();
      
      this.updateLastCheckedTime();
    } catch (error) {
      this.logger.error('Error checking connections', { error: error.message });
    }
  }
  
  /**
   * Check Wix API connection
   */
  async checkWixConnection() {
    try {
      this.updateConnectionStatus('wix', CONNECTION_STATUS.CONNECTING);
      
      const settings = this.settings.getSettings();
      const apiKey = settings.wixApiKey;
      const clientId = settings.wixClientId;
      const accountId = settings.wixAccountId;
      
      if (!apiKey || !clientId || !accountId) {
        this.logger.warn('Wix API credentials not configured');
        this.updateConnectionStatus('wix', CONNECTION_STATUS.DISCONNECTED);
        return false;
      }
      
      // In a real implementation, this would make an actual API call
      // For now, we'll simulate a successful connection if credentials exist
      this.updateConnectionStatus('wix', CONNECTION_STATUS.CONNECTED);
      return true;
    } catch (error) {
      this.logger.error('Error checking Wix connection', { error: error.message });
      this.updateConnectionStatus('wix', CONNECTION_STATUS.DISCONNECTED);
      return false;
    }
  }
  
  /**
   * Check TimeXpress connection
   */
  async checkTimeXpressConnection() {
    try {
      this.updateConnectionStatus('timeXpress', CONNECTION_STATUS.CONNECTING);
      
      const settings = this.settings.getSettings();
      let timeXpressPath = settings.timeClockDb || '';
      
      if (!timeXpressPath) {
        // Try to find TimeXpress database in default locations
        const possiblePaths = this.platform.getTimeXpressPaths();
        timeXpressPath = this.platform.findFirstExistingPath(possiblePaths);
        
        if (timeXpressPath) {
          // Save the found path to settings
          this.settings.updateSetting('timeClockDb', timeXpressPath);
        }
      }
      
      if (!timeXpressPath || !fs.existsSync(timeXpressPath)) {
        this.logger.warn('TimeXpress database not found');
        this.updateConnectionStatus('timeXpress', CONNECTION_STATUS.DISCONNECTED);
        return false;
      }
      
      this.updateConnectionStatus('timeXpress', CONNECTION_STATUS.CONNECTED);
      return true;
    } catch (error) {
      this.logger.error('Error checking TimeXpress connection', { error: error.message });
      this.updateConnectionStatus('timeXpress', CONNECTION_STATUS.DISCONNECTED);
      return false;
    }
  }
  
  /**
   * Check Scan-ID connection
   */
  async checkScanIDConnection() {
    try {
      this.updateConnectionStatus('scanID', CONNECTION_STATUS.CONNECTING);
      
      const settings = this.settings.getSettings();
      let scanIDPath = settings.scanIdPath || '';
      
      if (!scanIDPath) {
        // Use platform-specific default path
        scanIDPath = this.platform.getScanIDPath();
      }
      
      if (!fs.existsSync(scanIDPath)) {
        this.logger.warn('Scan-ID directory not found', { path: scanIDPath });
        this.updateConnectionStatus('scanID', CONNECTION_STATUS.DISCONNECTED);
        return false;
      }
      
      // Get the current date in YYYYMMDD format for finding today's exports
      const today = new Date();
      const dateString = today.getFullYear() + 
        String(today.getMonth() + 1).padStart(2, '0') + 
        String(today.getDate()).padStart(2, '0');
      
      // Look for today's export files
      const files = fs.readdirSync(scanIDPath)
        .filter(file => file.startsWith(dateString) && file.endsWith('.csv'));
      
      this.updateConnectionStatus('scanID', CONNECTION_STATUS.CONNECTED);
      return {
        connected: true,
        path: scanIDPath,
        filesFound: files.length,
        latestFile: files.length > 0 ? files[files.length - 1] : null
      };
    } catch (error) {
      this.logger.error('Error checking Scan-ID connection', { error: error.message });
      this.updateConnectionStatus('scanID', CONNECTION_STATUS.DISCONNECTED);
      return false;
    }
  }
  
  /**
   * Check database connection
   */
  async checkDatabaseConnection() {
    try {
      this.updateConnectionStatus('database', CONNECTION_STATUS.CONNECTING);
      
      // In a real implementation, this would check the actual database connection
      // For now, we'll simulate a successful connection
      this.updateConnectionStatus('database', CONNECTION_STATUS.CONNECTED);
      return true;
    } catch (error) {
      this.logger.error('Error checking database connection', { error: error.message });
      this.updateConnectionStatus('database', CONNECTION_STATUS.DISCONNECTED);
      return false;
    }
  }
  
  /**
   * Update connection status
   * @param {string} service - Service name (wix, timeXpress, scanID, database)
   * @param {string} status - Connection status
   */
  updateConnectionStatus(service, status) {
    if (this.state[service] !== status) {
      this.state[service] = status;
      this.logger.info(`${service} connection status changed`, { status });
      this.emit('connectionStatusChanged', { service, status });
    }
  }
  
  /**
   * Update last checked time
   */
  updateLastCheckedTime() {
    this.state.lastUpdated = new Date();
    this.emit('lastCheckedTimeUpdated', this.state.lastUpdated);
  }
  
  /**
   * Check Seq connection
   */
  async checkSeqConnection() {
    try {
      this.updateConnectionStatus('seq', CONNECTION_STATUS.CONNECTING);
      
      const settings = this.settings.getSettings();
      
      if (!settings.seqLoggingEnabled) {
        this.logger.debug('Seq logging not enabled');
        this.updateConnectionStatus('seq', CONNECTION_STATUS.DISCONNECTED);
        return false;
      }
      
      // Use the Logger's Seq connection check
      const status = await this.logger.checkSeqConnection();
      
      if (status.connected) {
        this.updateConnectionStatus('seq', CONNECTION_STATUS.CONNECTED);
        return true;
      } else {
        this.logger.warn('Seq connection failed', { error: status.error || status.message });
        this.updateConnectionStatus('seq', CONNECTION_STATUS.DISCONNECTED);
        return false;
      }
    } catch (error) {
      this.logger.error('Error checking Seq connection', { error: error.message });
      this.updateConnectionStatus('seq', CONNECTION_STATUS.DISCONNECTED);
      return false;
    }
  }
  
  /**
   * Get current connection status
   * @returns {Object} Current connection status
   */
  getConnectionStatus() {
    return { ...this.state };
  }
}

module.exports = ConnectionManager;
