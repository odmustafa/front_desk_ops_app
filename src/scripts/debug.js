/* global document, setInterval, app */

/**
 * Debug Console Functionality
 * Provides live log viewing and system information for developers
 */

// Initialize debug mode based on settings
const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('DebugScript');
let debugModeEnabled = false;

// DOM elements
const debugNavLink = document.querySelector('.debug-nav-link');
const developerModeToggle = document.getElementById('developer-mode');
const refreshLogsBtn = document.getElementById('refresh-logs-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const debugLogContent = document.getElementById('debug-log-content');

// System info elements
const debugAppVersion = document.getElementById('debug-app-version');
const debugElectronVersion = document.getElementById('debug-electron-version');
const debugPlatform = document.getElementById('debug-platform');
const debugLogPath = document.getElementById('debug-log-path');

// Connection status elements
const debugWixStatus = document.getElementById('debug-wix-status');
const debugTimeXpressStatus = document.getElementById('debug-timeXpress-status');
const debugScanIDStatus = document.getElementById('debug-scanID-status');
const debugDatabaseStatus = document.getElementById('debug-database-status');

/**
 * Initialize debug functionality
 */
function initDebug() {
  // Check if developer mode is enabled in settings
  loadDeveloperModeState();
  
  // Set up event listeners
  developerModeToggle.addEventListener('change', toggleDeveloperMode);
  refreshLogsBtn.addEventListener('click', refreshLogs);
  clearLogsBtn.addEventListener('click', clearLogs);
  
  // Load system information
  loadSystemInfo();
  
  // Initial logs load
  if (debugModeEnabled) {
    refreshLogs();
  }
  
  // Set up auto-refresh for logs (every 10 seconds)
  setInterval(() => {
    if (debugModeEnabled && document.getElementById('debug').classList.contains('active')) {
      refreshLogs();
    }
  }, 10000);
}

/**
 * Load developer mode state from settings
 */
function loadDeveloperModeState() {
  app.ipcRenderer.invoke('settings:getDeveloperMode')
    .then(enabled => {
      debugModeEnabled = enabled;
      developerModeToggle.checked = enabled;
      toggleDebugNavVisibility(enabled);
    })
    .catch(error => {
      logger.error('Failed to load developer mode state', { error });
    });
}

/**
 * Toggle developer mode
 */
function toggleDeveloperMode() {
  debugModeEnabled = developerModeToggle.checked;
  
  // Save the setting
  app.ipcRenderer.invoke('settings:setDeveloperMode', debugModeEnabled)
    .then(() => {
      toggleDebugNavVisibility(debugModeEnabled);
      
      // If enabling developer mode, load logs
      if (debugModeEnabled) {
        refreshLogs();
      }
    })
    .catch(error => {
      logger.error('Failed to save developer mode setting', { error });
    });
}

/**
 * Toggle debug navigation visibility
 */
function toggleDebugNavVisibility(visible) {
  if (visible) {
    debugNavLink.style.display = 'block';
  } else {
    debugNavLink.style.display = 'none';
    
    // If debug page is active, switch to dashboard
    if (document.getElementById('debug').classList.contains('active')) {
      document.querySelector('[data-page="dashboard"]').click();
    }
  }
}

/**
 * Refresh logs from the main process
 */
function refreshLogs() {
  if (!debugModeEnabled) return;
  
  app.ipcRenderer.invoke('debug:getLogs')
    .then(logs => {
      displayLogs(logs);
    })
    .catch(error => {
      logger.error('Failed to get logs', { error });
      debugLogContent.innerHTML = `<span class="log-error">Error loading logs: ${error.message}</span>`;
    });
}

/**
 * Display logs in the debug console
 */
function displayLogs(logs) {
  if (!logs || logs.length === 0) {
    debugLogContent.innerHTML = '<span class="log-info">No logs available</span>';
    return;
  }
  
  // Format and display logs
  const formattedLogs = logs.map(log => {
    const timestamp = log.timestamp ? `<span class="log-timestamp">[${log.timestamp}]</span>` : '';
    const level = log.level ? `<span class="log-${log.level.toLowerCase()}">[${log.level}]</span>` : '';
    const message = log.message || '';
    const data = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : '';
    
    return `${timestamp} ${level} ${message}${data}`;
  }).join('\n\n');
  
  debugLogContent.innerHTML = formattedLogs;
  
  // Scroll to bottom
  debugLogContent.scrollTop = debugLogContent.scrollHeight;
}

/**
 * Clear logs
 */
function clearLogs() {
  app.ipcRenderer.invoke('debug:clearLogs')
    .then(() => {
      debugLogContent.innerHTML = '<span class="log-info">Logs cleared</span>';
    })
    .catch(error => {
      logger.error('Failed to clear logs', { error });
    });
}

/**
 * Load system information
 */
function loadSystemInfo() {
  app.ipcRenderer.invoke('debug:getSystemInfo')
    .then(info => {
      debugAppVersion.textContent = info.appVersion || 'Unknown';
      debugElectronVersion.textContent = info.electronVersion || 'Unknown';
      debugPlatform.textContent = info.platform || 'Unknown';
      debugLogPath.textContent = info.logPath || 'Unknown';
      
      // Update connection status details
      updateConnectionStatusDetails();
    })
    .catch(error => {
      logger.error('Failed to get system info', { error });
    });
}

/**
 * Update connection status details
 */
function updateConnectionStatusDetails() {
  // Get the current status from the status dots
  const wixStatusDot = document.getElementById('wix-status-dot');
  const timeXpressStatusDot = document.getElementById('timeXpress-status-dot');
  const scanIDStatusDot = document.getElementById('scanID-status-dot');
  const databaseStatusDot = document.getElementById('database-status-dot');
  
  // Map status classes to text
  const statusMap = {
    'status-connected': 'Connected',
    'status-connecting': 'Connecting',
    'status-disconnected': 'Disconnected',
    'status-unknown': 'Unknown'
  };
  
  // Get status class (the second class in the classList)
  const getStatusText = (element) => {
    for (const cls of element.classList) {
      if (cls !== 'status-dot' && statusMap[cls]) {
        return statusMap[cls];
      }
    }
    return 'Unknown';
  };
  
  // Update status text
  debugWixStatus.textContent = getStatusText(wixStatusDot);
  debugTimeXpressStatus.textContent = getStatusText(timeXpressStatusDot);
  debugScanIDStatus.textContent = getStatusText(scanIDStatusDot);
  debugDatabaseStatus.textContent = getStatusText(databaseStatusDot);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDebug);
