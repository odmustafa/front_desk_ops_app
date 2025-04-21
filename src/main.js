const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const logger = require('./utils/logger');
const db = require('./database/db');

// Initialize API logger to log all axios requests/responses
require('./utils/api-logger');

// Log application start
logger.info('Application starting', { version: app.getVersion(), platform: process.platform });

// Load settings from storage
function loadSettings() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      appSettings = { ...appSettings, ...settings };
      logger.debug('Settings loaded', { settings: appSettings });
    }
  } catch (error) {
    logger.error('Failed to load settings', { error: error.message });
  }
}

// Save settings to storage
function saveSettings() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2), 'utf8');
    logger.debug('Settings saved', { settings: appSettings });
  } catch (error) {
    logger.error('Failed to save settings', { error: error.message });
  }
}

// Load settings on startup
loadSettings();

// Application settings
let appSettings = {
  developerMode: false
};

// Platform detection
const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// Log platform information
logger.info('Platform detected', { 
  platform: process.platform,
  isWindows,
  isMacOS,
  isLinux,
  arch: process.arch
});

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true
    }
  });
  
  // Set Content Security Policy that allows Bootstrap to work properly
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https://cdn.jsdelivr.net;",
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;",
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;",
          "img-src 'self' data:;",
          "font-src 'self' https://cdn.jsdelivr.net;",
          "connect-src 'self';"
        ].join(' ')
      }
    });
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development mode
  // mainWindow.webContents.openDevTools();

  // Handle window being closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Debug-related IPC handlers

/**
 * Get application logs
 */
ipcMain.handle('debug:getLogs', async () => {
  logger.debug('Retrieving application logs');
  try {
    // Get current log file path
    const logFiles = logger.getCurrentLogFiles ? logger.getCurrentLogFiles() : {
      projectLog: path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
    };
    
    // Read log file
    if (fs.existsSync(logFiles.projectLog)) {
      const logContent = fs.readFileSync(logFiles.projectLog, 'utf8');
      
      // Parse log entries (simple parsing for demonstration)
      const logEntries = logContent.split('\n\n')
        .filter(entry => entry.trim() !== '')
        .map(entry => {
          // Extract timestamp, level, and message
          const timestampMatch = entry.match(/\[(.*?)\]/); 
          const levelMatch = entry.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[(DEBUG|INFO|WARN|ERROR)\]/i);
          
          const timestamp = timestampMatch ? timestampMatch[1] : '';
          const level = levelMatch ? levelMatch[1] : 'INFO';
          const message = entry.replace(/\[.*?\] \[.*?\] /, '');
          
          return {
            timestamp,
            level,
            message
          };
        })
        .slice(-100); // Limit to last 100 entries
      
      return logEntries;
    } else {
      logger.warn('Log file not found', { path: logFiles.projectLog });
      return [];
    }
  } catch (error) {
    logger.error('Error retrieving logs', { error: error.message });
    return [];
  }
});

/**
 * Clear application logs
 */
ipcMain.handle('debug:clearLogs', async () => {
  logger.debug('Clearing application logs');
  try {
    // Get current log file path
    const logFiles = logger.getCurrentLogFiles ? logger.getCurrentLogFiles() : {
      projectLog: path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log'),
      userDataLog: path.join(app.getPath('userData'), 'logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
    };
    
    // Clear log files
    if (fs.existsSync(logFiles.projectLog)) {
      fs.writeFileSync(logFiles.projectLog, '', 'utf8');
    }
    
    if (fs.existsSync(logFiles.userDataLog)) {
      fs.writeFileSync(logFiles.userDataLog, '', 'utf8');
    }
    
    logger.info('Logs cleared');
    return { success: true };
  } catch (error) {
    logger.error('Error clearing logs', { error: error.message });
    return { success: false, error: error.message };
  }
});

/**
 * Get system information
 */
ipcMain.handle('debug:getSystemInfo', async () => {
  logger.debug('Retrieving system information');
  try {
    // Get current log file path
    const logFiles = logger.getCurrentLogFiles ? logger.getCurrentLogFiles() : {
      projectLog: path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
    };
    
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      logPath: logFiles.projectLog
    };
  } catch (error) {
    logger.error('Error retrieving system info', { error: error.message });
    return {};
  }
});

/**
 * Get developer mode setting
 */
ipcMain.handle('settings:getDeveloperMode', async () => {
  logger.debug('Getting developer mode setting');
  return appSettings.developerMode || false;
});

/**
 * Set developer mode setting
 */
ipcMain.handle('settings:setDeveloperMode', async (event, enabled) => {
  logger.debug('Setting developer mode', { enabled });
  appSettings.developerMode = enabled;
  saveSettings();
  return { success: true };
});

// IPC handlers for communication between main and renderer processes
// These will handle various integrations with external systems

/**
 * Simple Wix API test handler
 * Makes a basic API call to test connectivity
 */
ipcMain.handle('wix:testSimpleApi', async () => {
  logger.debug('Running simple Wix API test');
  try {
    // Get settings
    const settings = loadSettings();
    const wixApiKey = settings.wixApiKey || '';
    const wixSiteId = settings.wixSiteId || '';
    
    if (!wixApiKey || !wixSiteId) {
      logger.warn('Wix API credentials not configured for test');
      return { success: false, error: 'API credentials not configured' };
    }
    
    // Try a very simple API call to get site information
    logger.debug('Making simple Wix API call to test connectivity');
    
    // Use the simplest possible endpoint
    const response = await axios({
      method: 'GET',
      url: 'https://www.wixapis.com/site-properties/v4/properties',
      headers: {
        'Authorization': wixApiKey,
        'wix-site-id': wixSiteId,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    logger.info('Simple Wix API test successful', { status: response.status });
    
    // Return a simplified version of the response data
    return {
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      }
    };
  } catch (error) {
    logger.error('Simple Wix API test failed', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: `API test failed: ${error.message}`,
      errorDetails: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }
    };
  }
});

// Import configuration and Wix integration module
let config;
try {
  config = require('../config');
  console.log('Configuration loaded successfully');
} catch (error) {
  console.warn('Could not load config.js file. Using default configuration.');
  config = {
    wix: {
      siteId: '',
      apiKey: '',
      apiSecret: ''
    }
  };
}

const wixIntegration = require('./database/wix-integration');

// Wix API integration handlers
ipcMain.handle('wix:initConfig', async (event, credentials) => {
  try {
    logger.info('Initializing Wix configuration');
    // Use provided credentials or fall back to config file
    const wixCredentials = credentials || config.wix;
    // Log with sensitive data redacted
    logger.debug('Wix credentials provided', { 
      siteId: wixCredentials.siteId,
      hasApiKey: !!wixCredentials.apiKey,
      hasApiSecret: !!wixCredentials.apiSecret
    });
    
    const wixConfig = await wixIntegration.initWixConfig(wixCredentials);
    logger.info('Wix configuration initialized successfully');
    return { success: true, config: wixConfig };
  } catch (error) {
    logger.error('Error initializing Wix config:', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
});

// Initialize Wix integration with config file credentials on startup
if (config.wix && config.wix.siteId && config.wix.apiKey) {
  try {
    wixIntegration.initWixConfig(config.wix);
    console.log('Wix integration initialized with config file credentials');
  } catch (error) {
    console.error('Failed to initialize Wix integration with config file:', error);
  }
}

// Handler to save configuration to config.js file
ipcMain.handle('saveConfig', async (event, newConfig) => {
  try {
    // Merge with existing config
    const updatedConfig = { ...config, ...newConfig };
    
    // Format as JavaScript module
    const configContent = `/**
 * Configuration file for Front Desk Ops App
 * This file contains sensitive information and should not be committed to version control
 */

module.exports = ${JSON.stringify(updatedConfig, null, 2)};`;
    
    // Write to config.js file
    const configPath = path.join(__dirname, '../config.js');
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    // Update in-memory config
    config = updatedConfig;
    
    console.log('Configuration saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving configuration:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wix:testConnection', async () => {
  try {
    const result = await wixIntegration.testWixConnection();
    return { success: true, connected: result };
  } catch (error) {
    console.error('Error testing Wix connection:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wix:getMembers', async (event, filters) => {
  try {
    const members = await wixIntegration.getWixMembers(filters);
    return { success: true, members };
  } catch (error) {
    console.error('Error fetching Wix members:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wix:searchMembers', async (event, searchTerm) => {
  try {
    logger.info('Searching Wix members', { searchTerm });
    const members = await wixIntegration.searchWixMembers(searchTerm);
    logger.info('Wix member search completed', { searchTerm, resultsCount: members.length });
    return { success: true, members };
  } catch (error) {
    logger.error('Error searching Wix members:', { searchTerm, error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wix:getMember', async (event, memberId) => {
  try {
    logger.info('Getting member details', { memberId });
    
    // First try to get from local database cache
    let member = await db.getMemberById(memberId);
    
    if (member) {
      logger.debug('Member found in local cache', { memberId });
    } else {
      logger.debug('Member not found in cache, fetching from Wix API', { memberId });
      
      // Use a filter to get a specific member by ID
      const members = await wixIntegration.getWixMembers({ memberId });
      member = members && members.length > 0 ? members[0] : null;
      
      if (!member) {
        logger.warn('Member not found in Wix API', { memberId });
        throw new Error(`Member with ID ${memberId} not found`);
      }
      
      // Cache the member for future use
      logger.debug('Caching member data', { memberId });
      await db.cacheMember(member);
    }
    
    logger.info('Member details retrieved successfully', { memberId });
    return { success: true, member };
  } catch (error) {
    logger.error(`Error getting member:`, { memberId, error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
});

// Database handlers
ipcMain.handle('db:getCachedMembers', async (event, searchTerm) => {
  try {
    const members = await db.searchMembers(searchTerm);
    return members || [];
  } catch (error) {
    console.error('Error searching cached members:', error);
    return [];
  }
});

ipcMain.handle('db:cacheMember', async (event, member) => {
  try {
    await db.cacheMember(member);
    return { success: true };
  } catch (error) {
    console.error('Error caching member:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:getRecentCheckIns', async (event, limit) => {
  try {
    const checkIns = await db.getRecentCheckIns(limit);
    return checkIns;
  } catch (error) {
    console.error('Error getting recent check-ins:', error);
    return [];
  }
});

ipcMain.handle('wix:getEvents', async (event, limit) => {
  try {
    const events = await wixIntegration.getWixEvents(limit);
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching Wix events:', error);
    return { success: false, error: error.message };
  }
});

// ID Scanner integration
ipcMain.handle('scan-id', async (event, scanData) => {
  logger.debug('Processing ID scan data');
  
  try {
    // Get the Scan-ID export path from settings or use default Windows path
    const settings = loadSettings();
    let scanIdPath = settings.scanIdPath || '';
    
    // If no path is configured, use the default path based on platform
    if (!scanIdPath) {
      // Get user's home directory
      const homeDir = app.getPath('home');
      
      // Use platform-specific default paths
      if (isWindows) {
        // Windows: OneDrive path
        scanIdPath = path.join(homeDir, 'OneDrive', 'Documents', 'BCR', 'Scan-ID');
        logger.debug('Using default Windows Scan-ID path', { path: scanIdPath });
      } else if (isMacOS) {
        // macOS: Documents folder
        scanIdPath = path.join(homeDir, 'Documents', 'BCR', 'Scan-ID');
        logger.debug('Using default macOS Scan-ID path', { path: scanIdPath });
      } else {
        // Linux or other: Home directory
        scanIdPath = path.join(homeDir, 'BCR', 'Scan-ID');
        logger.debug('Using default Linux/other Scan-ID path', { path: scanIdPath });
      }
    }
    
    // Check if the directory exists
    if (!fs.existsSync(scanIdPath)) {
      logger.error('Scan-ID directory not found', { path: scanIdPath });
      return { 
        success: false, 
        error: `Scan-ID directory not found: ${scanIdPath}` 
      };
    }
    
    // Get the current date in YYYYMMDD format
    const today = new Date();
    const dateString = today.getFullYear() + 
      String(today.getMonth() + 1).padStart(2, '0') + 
      String(today.getDate()).padStart(2, '0');
    
    // Look for today's export file
    const filePattern = `${dateString}_*.csv`;
    const files = fs.readdirSync(scanIdPath)
      .filter(file => {
        // Match files with today's date pattern
        return file.startsWith(dateString) && file.endsWith('.csv');
      })
      .sort((a, b) => {
        // Sort by modification time (newest first)
        return fs.statSync(path.join(scanIdPath, b)).mtime.getTime() - 
               fs.statSync(path.join(scanIdPath, a)).mtime.getTime();
      });
    
    if (files.length === 0) {
      logger.warn('No Scan-ID export files found for today', { date: dateString });
      return { 
        success: false, 
        error: `No Scan-ID export files found for today (${dateString})` 
      };
    }
    
    // Get the most recent file
    const latestFile = files[0];
    const filePath = path.join(scanIdPath, latestFile);
    logger.debug('Found Scan-ID export file', { file: latestFile });
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Process the most recent scan (last non-empty line)
    let latestScan = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        // Parse the CSV line
        const fields = line.split(',');
        
        // Basic validation - ensure we have enough fields
        if (fields.length >= 5) {
          latestScan = {
            scanTime: fields[0],
            firstName: fields[1],
            lastName: fields[2],
            dateOfBirth: fields[3],
            idNumber: fields[4],
            // Add other fields as needed based on the CSV format
          };
          break;
        }
      }
    }
    
    if (!latestScan) {
      logger.warn('No valid scan data found in export file', { file: latestFile });
      return { 
        success: false, 
        error: 'No valid scan data found in export file' 
      };
    }
    
    logger.info('Successfully processed Scan-ID data', { 
      file: latestFile,
      name: `${latestScan.firstName} ${latestScan.lastName}`
    });
    
    return { 
      success: true, 
      data: latestScan 
    };
  } catch (error) {
    logger.error('Error processing Scan-ID data', { error: error.message });
    return { 
      success: false, 
      error: `Error processing Scan-ID data: ${error.message}` 
    };
  }
});

// Time Clock integration
ipcMain.handle('time-clock', async (event, timeData) => {
  // TODO: Implement integration with TimeXpress software
  console.log('Processing time clock data:', timeData);
  return { status: 'pending', message: 'Time Clock integration pending implementation' };
});

// Owncast integration
ipcMain.handle('owncast-status', async (event) => {
  // TODO: Implement integration with Owncast server
  console.log('Checking Owncast status');
  return { status: 'pending', message: 'Owncast integration pending implementation' };
});

// --- DATABASE ---
// Note: Database module is already imported at the top of the file

// Knowledge Base
ipcMain.handle('db:getKnowledgeBaseArticles', async () => {
  logger.debug('Getting knowledge base articles');
  return new Promise((resolve, reject) => {
    db.db.all('SELECT * FROM knowledge_base ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        logger.error('Error getting knowledge base articles', { error: err.message });
        reject(err);
      } else {
        logger.debug('Retrieved knowledge base articles', { count: rows.length });
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle('db:addKnowledgeBaseArticle', async (event, article) => {
  logger.debug('Adding knowledge base article', { title: article.title });
  return new Promise((resolve, reject) => {
    db.db.run('INSERT INTO knowledge_base (title, content, category) VALUES (?, ?, ?)', 
      [article.title, article.content, article.category], 
      function(err) {
        if (err) {
          logger.error('Error adding knowledge base article', { error: err.message });
          reject(err);
        } else {
          logger.info('Added knowledge base article', { id: this.lastID, title: article.title });
          resolve({ success: true, id: this.lastID });
        }
    });
  });
});


// Note: db:getCachedMembers handler is already defined above

// Incidents
ipcMain.handle('db:getIncidentReports', async () => {
  logger.debug('Getting incident reports');
  return new Promise((resolve, reject) => {
    db.db.all('SELECT * FROM incidents ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        logger.error('Error getting incident reports', { error: err.message });
        reject(err);
      } else {
        logger.debug('Retrieved incident reports', { count: rows.length });
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle('db:addIncidentReport', async (event, report) => {
  logger.debug('Adding incident report', { reporter: report.reported_by });
  return new Promise((resolve, reject) => {
    db.db.run(`INSERT INTO incidents 
      (reported_by, description, location, incident_type, incident_date, incident_time, action_taken, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [report.reported_by, report.description, report.location, report.incident_type, 
       report.incident_date, report.incident_time, report.action_taken, report.status], 
      function(err) {
        if (err) {
          logger.error('Error adding incident report', { error: err.message });
          reject(err);
        } else {
          logger.info('Added incident report', { id: this.lastID, reporter: report.reported_by });
          resolve({ success: true, id: this.lastID });
        }
    });
  });
});

// Announcements
ipcMain.handle('db:getAnnouncements', async () => {
  logger.debug('Getting announcements');
  return new Promise((resolve, reject) => {
    db.db.all('SELECT * FROM announcements ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        logger.error('Error getting announcements', { error: err.message });
        reject(err);
      } else {
        logger.debug('Retrieved announcements', { count: rows.length });
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle('db:addAnnouncement', async (event, announcement) => {
  logger.debug('Adding announcement', { title: announcement.title });
  return new Promise((resolve, reject) => {
    db.db.run(`INSERT INTO announcements 
      (title, content, priority, expiry_date) 
      VALUES (?, ?, ?, ?)`, 
      [announcement.title, announcement.content, announcement.priority, announcement.expiry_date], 
      function(err) {
        if (err) {
          logger.error('Error adding announcement', { error: err.message });
          reject(err);
        } else {
          logger.info('Added announcement', { id: this.lastID, title: announcement.title });
          resolve({ success: true, id: this.lastID });
        }
    });
  });
});

// Member Check-ins
ipcMain.handle('db:addCheckIn', async (event, checkIn) => {
  logger.debug('Adding member check-in', { memberName: checkIn.memberName });
  return new Promise((resolve, reject) => {
    db.db.run('INSERT INTO check_ins (member_id, member_name, purpose, notes) VALUES (?, ?, ?, ?)', 
      [checkIn.memberId, checkIn.memberName || 'Unknown', checkIn.purpose, checkIn.notes], 
      function(err) {
        if (err) {
          logger.error('Error adding check-in', { error: err.message });
          reject(err);
        } else {
          logger.info('Added check-in', { id: this.lastID, memberName: checkIn.memberName });
          resolve({ success: true, id: this.lastID });
        }
      });
  });
});

// These handlers are already defined above

// Helper function to load settings
function loadSettings() {
  let settings = {};
  try {
    // Try to load from settings file
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(settingsData);
      logger.debug('Settings loaded from file', { path: settingsPath });
    } else {
      // If settings file doesn't exist, try to load from default location
      const defaultSettingsPath = path.join(__dirname, 'config', 'settings.json');
      if (fs.existsSync(defaultSettingsPath)) {
        const settingsData = fs.readFileSync(defaultSettingsPath, 'utf8');
        settings = JSON.parse(settingsData);
        logger.debug('Settings loaded from default file', { path: defaultSettingsPath });
      } else {
        logger.warn('No settings file found');
      }
    }
  } catch (err) {
    logger.error('Error loading settings', { error: err.message });
  }
  return settings;
}

// Connection Status Handlers
ipcMain.handle('wix:checkConnection', async () => {
  logger.debug('Checking Wix connection');
  
  // First check basic network connectivity
  let networkConnected = false;
  try {
    const networkResponse = await axios.get('https://api.github.com', { 
      timeout: 3000,
      headers: { 'User-Agent': 'Front-Desk-Ops-App' }
    });
    networkConnected = true;
    logger.debug('Network connectivity verified', { 
      status: networkResponse.status
    });
  } catch (networkError) {
    logger.error('Network connectivity test failed', { 
      error: networkError.message,
      code: networkError.code
    });
    
    return { 
      success: false, 
      error: 'Network connectivity issue: ' + networkError.message,
      networkError: true
    };
  }
  
  // Load settings to check if we have Wix credentials
  const wixApiKey = appSettings.wixApiKey || '';
  const wixSiteId = appSettings.wixSiteId || '';
  
  if (!wixApiKey || !wixSiteId) {
    logger.warn('Wix API credentials not configured');
    return {
      success: false,
      error: 'Wix API credentials not fully configured',
      missingCredentials: true,
      details: {
        hasApiKey: !!wixApiKey,
        hasSiteId: !!wixSiteId
      }
    };
  }
  
  try {
    // First try the health endpoint to check if the API is reachable
    logger.debug('Checking Wix API health');
    try {
      const healthResponse = await axios({
        method: 'GET',
        url: 'https://www.wixapis.com/health',
        timeout: 5000
      });
      
      logger.debug('Wix API health check response', { status: healthResponse.status });
    } catch (healthError) {
      logger.warn('Wix API health check failed', { error: healthError.message });
      // Continue anyway as the health endpoint might not be accessible
    }
    
    // Try the members endpoint with proper parameters based on Wix API documentation
    logger.debug('Attempting Wix API authentication via members endpoint');
    const headers = {
      'Authorization': wixApiKey.startsWith('Bearer ') ? wixApiKey : `Bearer ${wixApiKey}`,
      'wix-site-id': wixSiteId,
      'Content-Type': 'application/json'
    };
    
    try {
      const membersResponse = await axios({
        method: 'GET',
        url: 'https://www.wixapis.com/members/v1/members',
        headers,
        params: {
          'fieldSet': 'PUBLIC',
          'paging.limit': 10
        },
        timeout: 10000 // Increased timeout for better reliability
      });
      
      logger.info('Wix connection successful via members endpoint', { 
        status: membersResponse.status,
        membersCount: membersResponse.data?.members?.length || 0 
      });
      
      return { 
        success: true,
        data: {
          connected: true,
          membersCount: membersResponse.data?.members?.length || 0
        }
      };
    } catch (membersError) {
      logger.warn('Wix members endpoint failed', {
        error: membersError.message,
        status: membersError.response?.status,
        data: membersError.response?.data
      });
      
      // Fall back to the site endpoint
      logger.debug('Attempting Wix API authentication via site endpoint');
      try {
        const siteResponse = await axios({
          method: 'GET',
          url: `https://www.wixapis.com/site/v1/sites/${wixSiteId}`,
          headers,
          timeout: 10000 // Increased timeout for better reliability
        });
        
        logger.info('Wix connection successful via site endpoint', { status: siteResponse.status });
        return { 
          success: true, 
          data: {
            connected: true,
            siteInfo: siteResponse.data?.site || {}
          }
        };
      } catch (siteError) {
        logger.warn('Wix site endpoint failed', {
          error: siteError.message,
          status: siteError.response?.status,
          data: siteError.response?.data
        });
        
        // Try one more approach - the OAuth token endpoint
        logger.debug('Attempting Wix API authentication via OAuth endpoint');
        try {
          const oauthResponse = await axios({
            method: 'POST',
            url: 'https://www.wix.com/oauth/access',
            headers: {
              'Content-Type': 'application/json'
            },
            data: {
              'grant_type': 'authorization_code',
              'client_id': appSettings.wixClientId || '',
              'client_secret': appSettings.wixClientSecret || '',
              'code': wixApiKey
            },
            timeout: 10000 // Increased timeout for better reliability
          });
          
          logger.info('Wix connection successful via OAuth endpoint', { status: oauthResponse.status });
          return { 
            success: true,
            data: {
              connected: true,
              authMethod: 'oauth'
            }
          };
        } catch (oauthError) {
          logger.error('All Wix API authentication methods failed', {
            membersError: membersError.message,
            siteError: siteError.message,
            oauthError: oauthError.message
          });
          
          return { 
            success: false, 
            error: 'All Wix API authentication methods failed',
            details: {
              membersError: membersError.message,
              siteError: siteError.message,
              oauthError: oauthError.message
            }
          };
        }
      }
    }
  } catch (error) {
    logger.error('Error checking Wix connection', { 
      error: error.message,
      stack: error.stack
    });
    return { 
      success: false, 
      error: error.message
    };
  }
});

ipcMain.handle('timeXpress:checkConnection', async () => {
  logger.debug('Checking TimeXpress connection');
  try {
    // Check if TimeXpress path is configured
    const settings = loadSettings();
    let timeXpressPath = settings.timeClockDb || '';
    
    // If no path is configured, use platform-specific default paths
    if (!timeXpressPath) {
      // Get user's home directory and program files directory
      const homeDir = app.getPath('home');
      
      if (isWindows) {
        // Windows: Typical TimeXpress installation location
        // First try Program Files, then Program Files (x86)
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        
        // Check common installation paths
        const possiblePaths = [
          path.join(programFiles, 'TimeXpress', 'Database', 'TimeXpress.db'),
          path.join(programFilesX86, 'TimeXpress', 'Database', 'TimeXpress.db'),
          path.join(homeDir, 'Documents', 'TimeXpress', 'Database', 'TimeXpress.db')
        ];
        
        // Use the first path that exists
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            timeXpressPath = possiblePath;
            logger.debug('Found TimeXpress database at', { path: timeXpressPath });
            break;
          }
        }
        
        if (!timeXpressPath) {
          // If no existing path found, use the most likely default
          timeXpressPath = path.join(programFiles, 'TimeXpress', 'Database', 'TimeXpress.db');
          logger.debug('Using default Windows TimeXpress path', { path: timeXpressPath });
        }
      } else if (isMacOS) {
        // macOS: Typical TimeXpress installation location
        timeXpressPath = path.join(homeDir, 'Applications', 'TimeXpress', 'Database', 'TimeXpress.db');
        logger.debug('Using default macOS TimeXpress path', { path: timeXpressPath });
      } else {
        // Linux or other: Home directory
        timeXpressPath = path.join(homeDir, 'TimeXpress', 'Database', 'TimeXpress.db');
        logger.debug('Using default Linux/other TimeXpress path', { path: timeXpressPath });
      }
    }
    
    // Check if the file exists
    const exists = fs.existsSync(timeXpressPath);
    
    logger.info('TimeXpress connection status', { 
      connected: exists,
      path: timeXpressPath,
      platform: process.platform
    });
    
    return { 
      success: exists,
      data: {
        path: timeXpressPath,
        exists: exists
      }
    };
  } catch (error) {
    logger.error('Error checking TimeXpress connection', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scanID:checkConnection', async () => {
  logger.debug('Checking Scan-ID connection');
  try {
    // Get the Scan-ID export path from settings or use default Windows path
    const settings = loadSettings();
    let scanIDPath = settings.scanIdPath || '';
    
    // If no path is configured, use the default path based on platform
    if (!scanIDPath) {
      // Get user's home directory
      const homeDir = app.getPath('home');
      
      // Use platform-specific default paths
      if (isWindows) {
        // Windows: OneDrive path
        scanIDPath = path.join(homeDir, 'OneDrive', 'Documents', 'BCR', 'Scan-ID');
        logger.debug('Using default Windows Scan-ID path', { path: scanIDPath });
      } else if (isMacOS) {
        // macOS: Documents folder
        scanIDPath = path.join(homeDir, 'Documents', 'BCR', 'Scan-ID');
        logger.debug('Using default macOS Scan-ID path', { path: scanIDPath });
      } else {
        // Linux or other: Home directory
        scanIDPath = path.join(homeDir, 'BCR', 'Scan-ID');
        logger.debug('Using default Linux/other Scan-ID path', { path: scanIDPath });
      }
    }
    
    // Check if the directory exists
    if (!fs.existsSync(scanIDPath)) {
      logger.error('Scan-ID directory not found', { path: scanIDPath });
      return { success: false, error: `Scan-ID directory not found: ${scanIDPath}` };
    }
    
    // Get the current date in YYYYMMDD format
    const today = new Date();
    const dateString = today.getFullYear() + 
      String(today.getMonth() + 1).padStart(2, '0') + 
      String(today.getDate()).padStart(2, '0');
    
    // Look for today's export files
    const files = fs.readdirSync(scanIDPath)
      .filter(file => file.startsWith(dateString) && file.endsWith('.csv'));
    
    if (files.length > 0) {
      logger.info('Scan-ID connection successful', { 
        path: scanIDPath,
        filesFound: files.length
      });
      return { 
        success: true,
        data: {
          path: scanIDPath,
          filesFound: files.length,
          latestFile: files[files.length - 1]
        }
      };
    } else {
      // Directory exists but no files for today
      logger.info('Scan-ID directory found but no export files for today', {
        path: scanIDPath,
        datePattern: dateString
      });
      return { 
        success: true, 
        data: {
          path: scanIDPath,
          filesFound: 0,
          message: 'No export files found for today, but directory exists'
        }
      };
    }
  } catch (error) {
    logger.error('Error checking Scan-ID connection', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:checkConnection', async () => {
  logger.debug('Checking database connection');
  try {
    // Check database connection by running a simple query
    return new Promise((resolve, reject) => {
      db.db.get('SELECT 1', (err) => {
        if (err) {
          logger.error('Database connection failed', { error: err.message });
          resolve({ success: false, error: err.message });
        } else {
          logger.info('Database connection successful');
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    logger.error('Error checking database connection', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('seq:checkConnection', async () => {
  logger.debug('Checking Seq connection');
  try {
    // Use the updated logger's Seq connection check
    const status = await logger.checkSeqConnection();
    
    if (status.connected) {
      logger.info('Seq connection successful', { url: status.url });
      return { 
        success: true,
        data: {
          url: status.url,
          connected: status.connected,
          enabled: status.enabled
        }
      };
    } else {
      logger.warn('Seq connection failed', { error: status.error || status.message });
      return { 
        success: false, 
        error: status.error || status.message 
      };
    }
  } catch (error) {
    logger.error('Error checking Seq connection', { error: error.message });
    return { 
      success: false, 
      error: error.message 
    };
  }
});
