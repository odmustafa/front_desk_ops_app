/**
 * Logger Utility for Front Desk Ops App
 * Handles console logging, file logging with daily rotation, and Seq logging
 */

const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron.app || electron.remote.app;
const LoggerService = require('./logger-service'); // Import LoggerService

// Try to load Seq bridge (will be available after app is ready)
let seqBridge = null;
let seqBridgeLoaded = false;

// We'll try to load the Seq bridge after a delay to avoid circular dependencies
const loadSeqBridge = () => {
  try {
    if (!seqBridgeLoaded) {
      seqBridge = require('./seq-bridge');
      seqBridgeLoaded = true;
      LoggerService.info('Seq bridge loaded successfully');
    }
  } catch (error) {
    LoggerService.info('Failed to load Seq bridge:', error.message);
  }
};

// Try to load after a delay to ensure app is initialized
setTimeout(loadSeqBridge, 3000);

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Log directories - one in user data dir and one in project root for easy access
const userDataLogDir = path.join(app.getPath('userData'), 'logs');
const projectLogDir = path.join(__dirname, '../../logs');

// Ensure log directories exist
if (!fs.existsSync(userDataLogDir)) {
  fs.mkdirSync(userDataLogDir, { recursive: true });
}

if (!fs.existsSync(projectLogDir)) {
  fs.mkdirSync(projectLogDir, { recursive: true });
}

/**
 * Get current log file paths (rotated daily)
 * @returns {Object} - Paths to current log files
 */
function getCurrentLogFiles() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `debug-${dateStr}.log`;
  
  return {
    userDataLog: path.join(userDataLogDir, filename),
    projectLog: path.join(projectLogDir, filename)
  };
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Optional data to log
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    try {
      if (typeof data === 'object') {
        logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += `\nData: ${data}`;
      }
    } catch (error) {
      logMessage += `\nData: [Unable to stringify data: ${error.message}]`;
    }
  }
  
  return logMessage;
}

/**
 * Write log to files
 * @param {string} message - Formatted log message
 */
function writeToFile(message) {
  try {
    const logFiles = getCurrentLogFiles();
    
    // Write to user data directory log
    fs.appendFileSync(logFiles.userDataLog, message + '\n');
    
    // Also write to project directory log for easier access
    fs.appendFileSync(logFiles.projectLog, message + '\n');
    
  } catch (error) {
    LoggerService.info('Failed to write to log files:', error);
  }
}

/**
 * Log a message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Optional data to log
 */
function log(level, message, data) {
  const formattedMessage = formatLogMessage(level, message, data);
  
  // Log to LoggerService
  switch (level) {
    case LOG_LEVELS.DEBUG:
      LoggerService.debug(formattedMessage);
      break;
    case LOG_LEVELS.INFO:
      LoggerService.info(formattedMessage);
      break;
    case LOG_LEVELS.WARN:
      LoggerService.warn(formattedMessage);
      break;
    case LOG_LEVELS.ERROR:
      LoggerService.error(formattedMessage);
      break;
    default:
      LoggerService.info(formattedMessage);
  }
  
  // Log to file
  writeToFile(formattedMessage);
  
  // Log to Seq if bridge is loaded
  if (seqBridgeLoaded && seqBridge) {
    try {
      seqBridge.logToSeq(level, message, data);
    } catch (error) {
      LoggerService.info('Error sending log to Seq:', error.message);
    }
  }
}

/**
 * Check Seq connection status
 * @returns {Promise<Object>} Connection status
 */
async function checkSeqConnection() {
  if (seqBridgeLoaded && seqBridge) {
    return await seqBridge.checkSeqConnection();
  }
  return { connected: false, enabled: false, message: 'Seq bridge not loaded' };
}

/**
 * Get Seq connection status
 * @returns {Object} Connection status
 */
function getSeqConnectionStatus() {
  if (seqBridgeLoaded && seqBridge) {
    return seqBridge.getSeqConnectionStatus();
  }
  return { connected: false, enabled: false, message: 'Seq bridge not loaded' };
}

// Exported logging functions
module.exports = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  LOG_LEVELS,
  getCurrentLogFiles,
  checkSeqConnection,
  getSeqConnectionStatus
};
