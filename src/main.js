const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const logger = require('./utils/logger');
const db = require('./database/db');

// Log application start
logger.info('Application starting', { version: app.getVersion(), platform: process.platform });

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
  // On macOS applications keep their menu bar active until the user quits
  // explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  // and there are no other windows open
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for communication between main and renderer processes
// These will handle various integrations with external systems

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
  // TODO: Implement integration with Scan-ID software
  console.log('Processing ID scan data:', scanData);
  return { status: 'pending', message: 'ID Scanner integration pending implementation' };
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
  try {
    // Check if Wix API key is configured
    const settings = loadSettings();
    
    const wixApiKey = settings.wixApiKey || '';
    const wixSiteId = settings.wixSiteId || '';
    const wixApiSecret = settings.wixApiSecret || '';
    
    if (!wixApiKey || !wixSiteId) {
      logger.warn('Wix API key or Site ID not configured');
      return { success: false, error: 'API credentials not fully configured' };
    }
    
    // First, verify we have network connectivity to Wix in general
    try {
      await axios.get('https://www.wix.com', { timeout: 5000 });
      logger.debug('Network connectivity to Wix.com verified');
    } catch (networkError) {
      logger.error('Network connectivity to Wix.com failed', { error: networkError.message });
      return { success: false, error: 'Cannot reach Wix.com - check internet connection' };
    }
    
    // Now attempt to authenticate with the Wix API
    try {
      // Make a request to the Wix REST API with proper authentication
      const response = await axios({
        method: 'GET',
        url: 'https://www.wixapis.com/v1/auth/token',
        headers: {
          'Authorization': wixApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });
      
      logger.info('Wix API authentication successful', { status: response.status });
      
      return { 
        success: true, 
        data: {
          connected: true,
          message: 'Successfully authenticated with Wix API'
        }
      };
    } catch (authError) {
      // Log the authentication error
      logger.error('Wix API authentication failed', {
        error: authError.message,
        status: authError.response?.status,
        statusText: authError.response?.statusText
      });
      
      // Return failure - no fallback method
      return {
        success: false,
        error: 'Wix API authentication failed: ' + (authError.response?.data?.message || authError.message)
      };
    }
  } catch (error) {
    // This could be a general error
    const errorMessage = error.message;
    logger.error('Error checking Wix connection', {
      error: errorMessage
    });
    
    return {
      success: false,
      error: 'Error checking connection: ' + errorMessage
    };
  }
});

ipcMain.handle('timeXpress:checkConnection', async () => {
  logger.debug('Checking TimeXpress connection');
  try {
    // Check if TimeXpress path is configured
    const settings = loadSettings();
    const timeXpressPath = settings.timeClockDb || '';
    if (!timeXpressPath) {
      logger.warn('TimeXpress path not configured');
      return { success: false, error: 'Path not configured' };
    }
    
    // Check if the file exists
    const exists = fs.existsSync(timeXpressPath);
    
    logger.info('TimeXpress connection status', { connected: exists });
    return { success: exists };
  } catch (error) {
    logger.error('Error checking TimeXpress connection', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scanID:checkConnection', async () => {
  logger.debug('Checking Scan-ID connection');
  try {
    // Check if Scan-ID path is configured
    const settings = loadSettings();
    const scanIDPath = settings.scanIdPath || '';
    if (!scanIDPath) {
      logger.warn('Scan-ID path not configured');
      return { success: false, error: 'Path not configured' };
    }
    
    // Check if the device/path exists
    const exists = fs.existsSync(scanIDPath);
    
    logger.info('Scan-ID connection status', { connected: exists });
    return { success: exists };
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
