/**
 * Logger.js
 * Enhanced logging functionality for the Front Desk Ops application
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const SeqLogger = require('../utils/SeqLogger');

class Logger {
  constructor(moduleName = 'App') {
    this.moduleName = moduleName;
    
    // Create logs directory if it doesn't exist
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Log file paths
    this.logFile = path.join(this.logsDir, 'app.log');
    this.errorFile = path.join(this.logsDir, 'error.log');
    
    // Max log file size (5MB)
    this.maxLogSize = 5 * 1024 * 1024;
    
    // Initialize Seq logger if configured
    this._initSeqLogger();
    
    // Check and rotate logs if needed
    this._checkAndRotateLogs();
  }
  
  /**
   * Initialize Seq logger
   * @private
   */
  _initSeqLogger() {
    try {
      // Try to load settings
      let settings = {};
      try {
        const Settings = require('./Settings');
        const settingsInstance = new Settings();
        settings = settingsInstance.getSettings();
      } catch (error) {
        console.warn('Could not load settings for Seq logger:', error.message);
      }
      
      // Check if Seq logging is enabled
      if (settings.seqLoggingEnabled) {
        this.seqLogger = new SeqLogger({
          url: settings.seqUrl || 'http://localhost:5341',
          apiKey: settings.seqApiKey || '',
          appName: settings.appName || 'FrontDeskOps',
          minLevel: settings.seqMinLogLevel || 'debug',
          enabled: true
        });
        
        console.log(`Seq logging initialized for ${this.moduleName}`);
      }
    } catch (error) {
      console.error('Failed to initialize Seq logger:', error);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  debug(message, data = {}) {
    this._log('DEBUG', message, data);
  }
  
  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  info(message, data = {}) {
    this._log('INFO', message, data);
  }
  
  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  warn(message, data = {}) {
    this._log('WARN', message, data);
  }
  
  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  error(message, data = {}) {
    this._log('ERROR', message, data);
    
    // Also write to error log file
    this._writeToErrorLog('ERROR', message, data);
  }
  
  /**
   * Log a message with specified level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @private
   */
  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const sanitizedData = this._sanitizeData(data);
    const logData = {
      timestamp,
      level,
      module: this.moduleName,
      message,
      ...sanitizedData
    };
    
    // Log to console
    console.log(`[${timestamp}] [${level}] [${this.moduleName}] ${message}`, sanitizedData);
    
    // Log to file
    this._writeToLogFile(logData);
    
    // Log to Seq if enabled
    if (this.seqLogger) {
      this.seqLogger.log(level.toLowerCase(), message, {
        ...sanitizedData,
        module: this.moduleName
      });
    }
  }
  
  /**
   * Write to the main log file
   * @param {Object} logData - Data to log
   * @private
   */
  _writeToLogFile(logData) {
    try {
      const logEntry = JSON.stringify(logData) + '\n';
      fs.appendFileSync(this.logFile, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  /**
   * Write to the error log file
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @private
   */
  _writeToErrorLog(level, message, data) {
    try {
      const timestamp = new Date().toISOString();
      const sanitizedData = this._sanitizeData(data);
      const logData = {
        timestamp,
        level,
        module: this.moduleName,
        message,
        ...sanitizedData
      };
      
      const logEntry = JSON.stringify(logData) + '\n';
      fs.appendFileSync(this.errorFile, logEntry, 'utf8');
      
      // Also log to Seq with higher priority
      if (this.seqLogger) {
        this.seqLogger.log('error', message, {
          ...sanitizedData,
          module: this.moduleName,
          isErrorLog: true
        });
      }
    } catch (error) {
      console.error('Failed to write to error log file:', error);
    }
  }
  
  /**
   * Check log file size and rotate if needed
   * @private
   */
  _checkAndRotateLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        
        if (stats.size > this.maxLogSize) {
          // Rotate log file
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const rotatedLogFile = path.join(this.logsDir, `app-${timestamp}.log`);
          
          fs.renameSync(this.logFile, rotatedLogFile);
          fs.writeFileSync(this.logFile, '', 'utf8');
          
          this.info('Log file rotated', { oldFile: rotatedLogFile, newFile: this.logFile });
        }
      }
      
      // Also check error log
      if (fs.existsSync(this.errorFile)) {
        const stats = fs.statSync(this.errorFile);
        
        if (stats.size > this.maxLogSize) {
          // Rotate error log file
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const rotatedErrorFile = path.join(this.logsDir, `error-${timestamp}.log`);
          
          fs.renameSync(this.errorFile, rotatedErrorFile);
          fs.writeFileSync(this.errorFile, '', 'utf8');
          
          this.info('Error log file rotated', { oldFile: rotatedErrorFile, newFile: this.errorFile });
        }
      }
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }
  
  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   * @private
   */
  _sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = { ...data };
    
    // List of sensitive fields to redact
    const sensitiveFields = [
      'password', 'apiKey', 'secret', 'token', 'accessToken', 'refreshToken',
      'wixApiKey', 'wixApiSecret', 'secretAccessKey'
    ];
    
    // Redact sensitive fields
    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this._sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Get all log entries
   * @param {number} maxEntries - Maximum number of entries to return
   * @returns {Array} Log entries
   */
  getLogEntries(maxEntries = 100) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      // Parse JSON log entries
      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return { raw: line, parseError: true };
        }
      });
      
      // Return most recent entries first
      return entries.reverse().slice(0, maxEntries);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
  
  /**
   * Get error log entries
   * @param {number} maxEntries - Maximum number of entries to return
   * @returns {Array} Error log entries
   */
  getErrorLogEntries(maxEntries = 100) {
    try {
      if (!fs.existsSync(this.errorFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.errorFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      // Parse JSON log entries
      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return { raw: line, parseError: true };
        }
      });
      
      // Return most recent entries first
      return entries.reverse().slice(0, maxEntries);
    } catch (error) {
      console.error('Failed to read error log file:', error);
      return [];
    }
  }
  
  /**
   * Check Seq connection status
   * @returns {Promise<Object>} Connection status
   */
  async checkSeqConnection() {
    if (!this.seqLogger) {
      return {
        connected: false,
        enabled: false,
        message: 'Seq logging is not configured'
      };
    }
    
    return await this.seqLogger.checkConnection();
  }
  
  /**
   * Get current Seq connection status
   * @returns {Object} Connection status
   */
  getSeqConnectionStatus() {
    if (!this.seqLogger) {
      return {
        connected: false,
        enabled: false,
        message: 'Seq logging is not configured'
      };
    }
    
    return this.seqLogger.getConnectionStatus();
  }
}

module.exports = Logger;
