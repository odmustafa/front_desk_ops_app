// Global error handlers for maximum resilience
process.on('uncaughtException', (err) => {
  const ErrorHandler = require('./utils/ErrorHandler');
  ErrorHandler.handleFatalError(err);
});
process.on('unhandledRejection', (reason, promise) => {
  const ErrorHandler = require('./utils/ErrorHandler');
  ErrorHandler.handleFatalError(reason);
});

try {
  const { app, BrowserWindow, ipcMain, dialog } = require('electron');
  const path = require('path');
  const fs = require('fs');
  const sqlite3 = require('sqlite3').verbose();
  const axios = require('axios');

  // AppController orchestrates all app logic and IPC
  const AppController = require('./core/AppController');
const { logger } = require('./core/Logger');
logger.info('Application Starting');
  const appController = new AppController(app, BrowserWindow, ipcMain, dialog, path, fs, sqlite3, axios);
  appController.start();

} catch (error) {
  // Delegate fatal error handling to ErrorHandler
  const ErrorHandler = require('./utils/ErrorHandler');
  ErrorHandler.handleFatalError(error);
}
