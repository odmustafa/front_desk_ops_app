// SettingsController.js
// Handles application settings IPC handlers

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class SettingsController {
  constructor(ipcMain, appSettings, saveSettings, logger) {
    this.ipcMain = ipcMain;
    this.appSettings = appSettings;
    this.saveSettings = saveSettings;
    this.logger = logger;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('settings:getDeveloperMode', async () => {
      this.logger.debug('Getting developer mode setting');
      return this.appSettings.developerMode || false;
    });

    this.ipcMain.handle('settings:setDeveloperMode', async (event, enabled) => {
      this.logger.debug('Setting developer mode', { enabled });
      this.appSettings.developerMode = enabled;
      this.saveSettings();
      return { success: true };
    });
  }
}

module.exports = SettingsController;
