const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Import logger
const logger = require('./utils/logger');

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
      enableRemoteModule: false
    }
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
  return new Promise((resolve, reject) => {
    db.db.all('SELECT * FROM knowledge_base ORDER BY created_at DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('db:addKnowledgeBaseArticle', async (event, article) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO knowledge_base (title, content, category) VALUES (?, ?, ?)', [article.title, article.content, article.category], function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  });
});

// Member Check-ins
ipcMain.handle('db:addCheckIn', async (event, checkIn) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO check_ins (member_id, member_name, purpose, notes) VALUES (?, ?, ?, ?)',
      [checkIn.memberId, checkIn.memberName || 'Unknown', checkIn.purpose, checkIn.notes],
      function(err) {
        if (err) reject(err);
        else resolve({ success: true, id: this.lastID });
      }
    );
  });
});

// Note: db:getRecentCheckIns handler is already defined above

// Note: db:cacheMember handler is already defined above

// Note: db:getCachedMembers handler is already defined above

// Incidents
ipcMain.handle('db:getIncidentReports', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM incidents ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});
ipcMain.handle('db:addIncidentReport', async (event, report) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO incidents (reported_by, description, status) VALUES (?, ?, ?)', [report.reported_by, report.description, report.status || 'open'], function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  });
});

// Announcements
ipcMain.handle('db:getAnnouncements', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM announcements ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});
ipcMain.handle('db:addAnnouncement', async (event, announcement) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO announcements (title, content, priority) VALUES (?, ?, ?)', [announcement.title, announcement.content, announcement.priority || 'normal'], function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  });
});
