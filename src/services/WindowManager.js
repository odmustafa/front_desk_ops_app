// services/WindowManager.js
// Handles Electron window creation and app lifecycle events

class WindowManager {
  constructor(app, BrowserWindow, logger, path) {
    this.app = app;
    this.BrowserWindow = BrowserWindow;
    this.logger = logger;
    this.path = path;
    this.mainWindow = null;
  }

  createWindow() {
    this.mainWindow = new this.BrowserWindow({
      width: 1400,
      height: 900,
      icon: this.path.join(__dirname, '../assets/logo.png'),
      webPreferences: {
        preload: this.path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        webSecurity: true
      }
    });

    // Set Content Security Policy
    this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
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

    this.mainWindow.loadFile(this.path.join(__dirname, '../views/main.html'));
    this.mainWindow.on('closed', () => { this.mainWindow = null; });
  }

  setupAppEvents() {
    this.app.whenReady().then(() => this.createWindow());

    this.app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') this.app.quit();
    });

    this.app.on('activate', () => {
      if (this.BrowserWindow.getAllWindows().length === 0) this.createWindow();
    });
  }
}

module.exports = WindowManager;
