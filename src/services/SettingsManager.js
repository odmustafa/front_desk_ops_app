// SettingsManager.js
// Handles loading, saving, and validating app settings

const LoggerService = require('./LoggerService');

class SettingsManager {
  constructor() {
    this.logger = new LoggerService('SettingsManager');
  }
  loadSettings() {
    const path = require('path');
    const fs = require('fs');
    const { app } = require('electron');
    try {
      const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        return settings;
      }
    } catch (error) {
      this.logger.error('Failed to load settings', { error: error.message });
    }
    return {};
  }
  saveSettings(settings) {
    const path = require('path');
    const fs = require('fs');
    const { app } = require('electron');
    try {
      const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      this.logger.debug('Settings saved', { settings });
    } catch (error) {
      this.logger.error('Failed to save settings', { error: error.message });
    }
  }
  validateSettings(settings) {
    // Add validation logic as needed
    return true;
  }
}

module.exports = SettingsManager;
