const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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

// Wix API integration
ipcMain.handle('wix-get-member', async (event, memberData) => {
  // TODO: Implement Wix API integration to fetch member data
  console.log('Fetching member data from Wix:', memberData);
  return { status: 'pending', message: 'Wix integration pending implementation' };
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

// --- DATABASE IPC HANDLERS ---
const { db } = require('./database/db');

// Knowledge Base
ipcMain.handle('db:getKnowledgeBaseArticles', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM knowledge_base ORDER BY created_at DESC', [], (err, rows) => {
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
