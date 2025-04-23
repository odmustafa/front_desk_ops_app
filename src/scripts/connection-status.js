/**
 * Front Desk Ops Application - Connection Status Module
 * Handles monitoring and displaying connection status for various services
 */

// Connection status script for Tribute Music Gallery
const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('ConnectionStatusScript');

// Connection status constants
const CONNECTION_STATUS = {
  UNKNOWN: 'unknown',
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected'
};

// Connection elements
const wixStatusDot = document.getElementById('wix-status-dot');
const timeXpressStatusDot = document.getElementById('timeXpress-status-dot');
const scanIDStatusDot = document.getElementById('scanID-status-dot');
const databaseStatusDot = document.getElementById('database-status-dot');
const seqStatusDot = document.getElementById('seq-status-dot');
const lastUpdatedText = document.getElementById('connection-last-updated');

// Connection status state
const connectionState = {
  wix: CONNECTION_STATUS.UNKNOWN,
  timeXpress: CONNECTION_STATUS.UNKNOWN,
  scanID: CONNECTION_STATUS.UNKNOWN,
  database: CONNECTION_STATUS.UNKNOWN,
  seq: CONNECTION_STATUS.UNKNOWN,
  lastUpdated: null
};

/**
 * Initialize connection status monitoring
 */
function initializeConnectionStatus() {
  // Set initial status to unknown
  updateConnectionStatus('wix', CONNECTION_STATUS.UNKNOWN);
  updateConnectionStatus('timeXpress', CONNECTION_STATUS.UNKNOWN);
  updateConnectionStatus('scanID', CONNECTION_STATUS.UNKNOWN);
  updateConnectionStatus('database', CONNECTION_STATUS.UNKNOWN);
  updateConnectionStatus('seq', CONNECTION_STATUS.UNKNOWN);
  
  // Start periodic status checks
  checkConnectionStatus();
  
  // Check status every 30 seconds
  setInterval(checkConnectionStatus, 30000);
}

/**
 * Check status of all connections
 */
async function checkConnectionStatus() {
  try {
    // Check Wix connection
    checkWixConnection();
    
    // Check TimeXpress connection
    checkTimeXpressConnection();
    
    // Check Scan-ID connection
    checkScanIDConnection();
    
    // Check database connection
    checkDatabaseConnection();
    
    // Check Seq connection
    checkSeqConnection();
    
    // Update last checked time
    updateLastCheckedTime();
  } catch (error) {
    logger.error('Error checking connection status', { error });
  }
}

/**
 * Check Wix API connection
 */
async function checkWixConnection() {
  try {
    updateConnectionStatus('wix', CONNECTION_STATUS.CONNECTING);
    
    // Try to connect to Wix API
    const result = await window.app.ipcRenderer.invoke('wix:checkConnection');
    
    if (result.success) {
      updateConnectionStatus('wix', CONNECTION_STATUS.CONNECTED);
    } else {
      updateConnectionStatus('wix', CONNECTION_STATUS.DISCONNECTED);
    }
  } catch (error) {
    logger.error('Error checking Wix connection', { error });
    updateConnectionStatus('wix', CONNECTION_STATUS.DISCONNECTED);
  }
}

/**
 * Check TimeXpress connection
 */
async function checkTimeXpressConnection() {
  try {
    updateConnectionStatus('timeXpress', CONNECTION_STATUS.CONNECTING);
    
    // Try to connect to TimeXpress
    const result = await window.app.ipcRenderer.invoke('timeXpress:checkConnection');
    
    if (result.success) {
      updateConnectionStatus('timeXpress', CONNECTION_STATUS.CONNECTED);
    } else {
      updateConnectionStatus('timeXpress', CONNECTION_STATUS.DISCONNECTED);
    }
  } catch (error) {
    logger.error('Error checking TimeXpress connection', { error });
    updateConnectionStatus('timeXpress', CONNECTION_STATUS.DISCONNECTED);
  }
}

/**
 * Check Scan-ID connection
 */
async function checkScanIDConnection() {
  try {
    updateConnectionStatus('scanID', CONNECTION_STATUS.CONNECTING);
    
    // Try to connect to Scan-ID
    const result = await window.app.ipcRenderer.invoke('scanID:checkConnection');
    
    if (result.success) {
      updateConnectionStatus('scanID', CONNECTION_STATUS.CONNECTED);
    } else {
      updateConnectionStatus('scanID', CONNECTION_STATUS.DISCONNECTED);
    }
  } catch (error) {
    logger.error('Error checking Scan-ID connection', { error });
    updateConnectionStatus('scanID', CONNECTION_STATUS.DISCONNECTED);
  }
}

/**
 * Check database connection
 */
async function checkDatabaseConnection() {
  try {
    updateConnectionStatus('database', CONNECTION_STATUS.CONNECTING);
    
    // Try to connect to database
    const result = await window.app.ipcRenderer.invoke('db:checkConnection');
    
    if (result.success) {
      updateConnectionStatus('database', CONNECTION_STATUS.CONNECTED);
    } else {
      updateConnectionStatus('database', CONNECTION_STATUS.DISCONNECTED);
    }
  } catch (error) {
    logger.error('Error checking database connection', { error });
    updateConnectionStatus('database', CONNECTION_STATUS.DISCONNECTED);
  }
}

/**
 * Check Seq connection
 */
async function checkSeqConnection() {
  try {
    updateConnectionStatus('seq', CONNECTION_STATUS.CONNECTING);
    
    // Try to connect to Seq server
    const result = await window.app.ipcRenderer.invoke('seq:checkConnection');
    
    if (result.success) {
      updateConnectionStatus('seq', CONNECTION_STATUS.CONNECTED);
    } else {
      updateConnectionStatus('seq', CONNECTION_STATUS.DISCONNECTED);
    }
  } catch (error) {
    logger.error('Error checking Seq connection', { error });
    updateConnectionStatus('seq', CONNECTION_STATUS.DISCONNECTED);
  }
}

/**
 * Update connection status in UI
 * @param {string} service - The service to update (wix, timeXpress, scanID, database, seq)
 * @param {string} status - The status to set (connected, connecting, disconnected, unknown)
 */
function updateConnectionStatus(service, status) {
  // Update state
  connectionState[service] = status;
  
  // Get status dot element
  let statusDot;
  switch (service) {
    case 'wix':
      statusDot = wixStatusDot;
      break;
    case 'timeXpress':
      statusDot = timeXpressStatusDot;
      break;
    case 'scanID':
      statusDot = scanIDStatusDot;
      break;
    case 'database':
      statusDot = databaseStatusDot;
      break;
    case 'seq':
      statusDot = seqStatusDot;
      break;
    default:
      return;
  }
  
  // Remove all status classes
  statusDot.classList.remove(
    `status-${CONNECTION_STATUS.UNKNOWN}`,
    `status-${CONNECTION_STATUS.CONNECTED}`,
    `status-${CONNECTION_STATUS.CONNECTING}`,
    `status-${CONNECTION_STATUS.DISCONNECTED}`
  );
  
  // Add appropriate status class
  statusDot.classList.add(`status-${status}`);
}

/**
 * Update last checked time
 */
function updateLastCheckedTime() {
  const now = new Date();
  connectionState.lastUpdated = now;
  
  // Format time as HH:MM:SS
  const timeString = now.toLocaleTimeString();
  
  // Update UI
  if (lastUpdatedText) {
    lastUpdatedText.textContent = `Last updated: ${timeString}`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeConnectionStatus);
