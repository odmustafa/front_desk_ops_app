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
    console.error('Failed to write to log files:', error);
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
