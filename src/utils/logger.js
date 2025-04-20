/**
 * Logger Utility for Front Desk Ops App
 * Handles console logging and file logging with daily rotation
 */

const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron.app || electron.remote.app;

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Log directory path
const logDir = path.join(app.getPath('userData'), 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Get current log file path (rotated daily)
 * @returns {string} - Path to current log file
 */
function getCurrentLogFile() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `debug-${dateStr}.log`);
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
 * Write log to file
 * @param {string} message - Formatted log message
 */
function writeToFile(message) {
  try {
    const logFile = getCurrentLogFile();
    fs.appendFileSync(logFile, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
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
  
  // Log to console
  switch (level) {
    case LOG_LEVELS.DEBUG:
      console.debug(formattedMessage);
      break;
    case LOG_LEVELS.INFO:
      console.info(formattedMessage);
      break;
    case LOG_LEVELS.WARN:
      console.warn(formattedMessage);
      break;
    case LOG_LEVELS.ERROR:
      console.error(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
  
  // Log to file
  writeToFile(formattedMessage);
}

// Exported logging functions
module.exports = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  LOG_LEVELS
};
