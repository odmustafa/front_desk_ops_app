/**
 * seq-bridge.js
 * Bridges the existing logger with Seq logging functionality
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const SeqLogger = require('../utils/SeqLogger');
const LoggerService = require('../utils/LoggerService'); // Import LoggerService

// Initialize Seq logger
let seqLogger = null;
let seqEnabled = false;

/**
 * Initialize Seq logger from settings
 */
function initializeSeq() {
  try {
    // Load settings from app-settings.json
    const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
    let settings = {};
    
    if (fs.existsSync(settingsPath)) {
      try {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsData);
      } catch (err) {
        LoggerService.error('Failed to parse settings file:', err.message);
      }
    }
    
    // Also check seq-logging.json file
    const seqConfigPath = path.join(__dirname, '..', 'config', 'seq-logging.json');
    if (fs.existsSync(seqConfigPath)) {
      try {
        const seqConfigData = fs.readFileSync(seqConfigPath, 'utf8');
        const seqSettings = JSON.parse(seqConfigData);
        settings = { ...settings, ...seqSettings };
      } catch (err) {
        LoggerService.error('Failed to parse seq-logging.json file:', err.message);
      }
    }
    
    // Check if Seq logging is enabled
    if (settings.seqLoggingEnabled) {
      seqLogger = new SeqLogger({
        url: settings.seqUrl || 'http://localhost:5341',
        apiKey: settings.seqApiKey || '',
        appName: settings.appName || 'FrontDeskOps',
        minLevel: settings.seqMinLogLevel || 'debug',
        enabled: true
      });
      
      seqEnabled = true;
      LoggerService.info('Seq logging bridge initialized:', settings.seqUrl);
    }
  } catch (error) {
    LoggerService.error('Failed to initialize Seq bridge:', error);
  }
}

// Initialize on load
initializeSeq();

/**
 * Log to Seq
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Log data
 */
function logToSeq(level, message, data = {}) {
  if (!seqEnabled || !seqLogger) return;
  
  try {
    seqLogger.log(level.toLowerCase(), message, data);
  } catch (error) {
    LoggerService.error('Error sending log to Seq:', error);
  }
}

/**
 * Check Seq connection
 * @returns {Promise<Object>} Connection status
 */
async function checkSeqConnection() {
  if (!seqEnabled || !seqLogger) {
    return { 
      connected: false, 
      enabled: false,
      message: 'Seq logging is not enabled'
    };
  }
  
  return await seqLogger.checkConnection();
}

/**
 * Get Seq connection status
 * @returns {Object} Connection status
 */
function getSeqConnectionStatus() {
  if (!seqEnabled || !seqLogger) {
    return { 
      connected: false, 
      enabled: false,
      message: 'Seq logging is not enabled'
    };
  }
  
  return seqLogger.getConnectionStatus();
}

// Export functions
module.exports = {
  logToSeq,
  checkSeqConnection,
  getSeqConnectionStatus
};
