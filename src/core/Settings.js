/**
 * Settings.js
 * Manages application settings with persistence
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const Logger = require('./Logger');

class Settings {
  constructor() {
    const { createLogger } = require('./Logger');
    this.logger = createLogger(this.constructor.name);
    this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
    this.configPath = path.join(__dirname, '..', 'config', 'settings.json');
    
    // Default settings
    this.settings = {
      developerMode: false,
      wixApiKey: '',
      wixSiteId: '',
      wixApiSecret: '',
      wixClientId: '',
      wixAccountId: '',
      owncastUrl: '',
      scanIdPath: '',
      timeClockDb: '',
      
      // Seq logging settings
      seqLoggingEnabled: false,
      seqUrl: 'http://localhost:5341',
      seqApiKey: '',
      seqMinLogLevel: 'debug',
      
      // Cloud storage settings
      r2AccountId: '',
      r2AccessKeyId: '',
      r2SecretAccessKey: '',
      r2Bucket: '',
      
      // CosmosDB settings
      cosmosEndpoint: '',
      cosmosKey: '',
      cosmosDatabase: ''
    };
    
    this.loadSettings();
  }
  
  /**
   * Load settings from storage
   */
  loadSettings() {
    try {
      // First try to load from user settings
      if (fs.existsSync(this.settingsPath)) {
        const settingsData = fs.readFileSync(this.settingsPath, 'utf8');
        const userSettings = JSON.parse(settingsData);
        this.settings = { ...this.settings, ...userSettings };
        this.logger.debug('Settings loaded from user data', { path: this.settingsPath });
      } 
      // Then try to load from config file
      else if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const configSettings = JSON.parse(configData);
        this.settings = { ...this.settings, ...configSettings };
        this.logger.debug('Settings loaded from config', { path: this.configPath });
        
        // Save to user settings for future use
        this.saveSettings();
      }
      
      // Load Seq logging configuration if available
      this.loadSeqLoggingSettings();
    } catch (error) {
      this.logger.error('Failed to load settings', { error: error.message });
    }
  }
  
  /**
   * Load Seq logging settings from config file
   */
  loadSeqLoggingSettings() {
    try {
      const seqConfigPath = path.join(__dirname, '..', 'config', 'seq-logging.json');
      
      if (fs.existsSync(seqConfigPath)) {
        const seqConfigData = fs.readFileSync(seqConfigPath, 'utf8');
        const seqSettings = JSON.parse(seqConfigData);
        
        // Update settings with Seq configuration
        this.settings = { ...this.settings, ...seqSettings };
        this.logger.debug('Seq logging settings loaded', { 
          enabled: seqSettings.seqLoggingEnabled,
          url: seqSettings.seqUrl
        });
        
        // Save to user settings for future use
        this.saveSettings();
      }
    } catch (error) {
      this.logger.error('Failed to load Seq logging settings', { error: error.message });
    }
  }
  
  /**
   * Save settings to storage
   */
  saveSettings() {
    try {
      const settingsDir = path.dirname(this.settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
      this.logger.debug('Settings saved', { path: this.settingsPath });
    } catch (error) {
      this.logger.error('Failed to save settings', { error: error.message });
    }
  }
  
  /**
   * Get all settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * Get a specific setting
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if setting not found
   * @returns {*} Setting value
   */
  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }
  
  /**
   * Update a setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }
  
  /**
   * Update multiple settings
   * @param {Object} settings - Settings to update
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }
}

module.exports = Settings;
