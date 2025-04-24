/**
 * ScanIDService.js
 * Handles integration with Scan-ID hardware and export files
 */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const LoggerService = require('../services/LoggerService');
const Settings = require('../core/Settings');
const PlatformHelper = require('../utils/PlatformHelper');

class ScanIDService {
  constructor() {
    this.logger = new LoggerService('ScanIDService');
    this.settings = new Settings();
    this.platform = new PlatformHelper();
    this.exportPath = null;
    this.initialize();
  }

  /**
   * Initialize the service
   */
  initialize() {
    try {
      const settings = this.settings.getSettings();
      this.exportPath = settings.scanIdPath || '';
      
      if (!this.exportPath) {
        // Use platform-specific default path
        this.exportPath = this.platform.getScanIDPath();
        this.logger.debug('Using default Scan-ID path', { path: this.exportPath });
      }
      
      // Ensure export directory exists
      if (!fs.existsSync(this.exportPath)) {
        this.logger.warn('Scan-ID export directory not found', { path: this.exportPath });
      } else {
        this.logger.info('Scan-ID service initialized', { path: this.exportPath });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Scan-ID service', { error: error.message });
    }
  }

  /**
   * Check connection to Scan-ID
   * @returns {Promise<Object>} Connection status
   */
  async checkConnection() {
    try {
      if (!this.exportPath) {
        return { 
          success: false, 
          error: 'Export path not configured' 
        };
      }
      
      if (!fs.existsSync(this.exportPath)) {
        return { 
          success: false, 
          error: `Export directory not found: ${this.exportPath}` 
        };
      }
      
      // Get the current date in YYYYMMDD format
      const today = new Date();
      const dateString = today.getFullYear() + 
        String(today.getMonth() + 1).padStart(2, '0') + 
        String(today.getDate()).padStart(2, '0');
      
      // Look for today's export files
      const files = fs.readdirSync(this.exportPath)
        .filter(file => file.startsWith(dateString) && file.endsWith('.csv'));
      
      if (files.length > 0) {
        this.logger.info('Scan-ID connection successful', { 
          path: this.exportPath,
          filesFound: files.length
        });
        
        return { 
          success: true,
          data: {
            path: this.exportPath,
            filesFound: files.length,
            latestFile: files[files.length - 1]
          }
        };
      } else {
        // Directory exists but no files for today
        this.logger.info('Scan-ID directory found but no export files for today', {
          path: this.exportPath,
          datePattern: dateString
        });
        
        return { 
          success: true, 
          data: {
            path: this.exportPath,
            filesFound: 0,
            message: 'No export files found for today, but directory exists'
          }
        };
      }
    } catch (error) {
      this.logger.error('Error checking Scan-ID connection', { error: error.message });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get today's scan data
   * @returns {Promise<Array>} Scan data
   */
  async getTodayScans() {
    try {
      const connectionStatus = await this.checkConnection();
      
      if (!connectionStatus.success || connectionStatus.data.filesFound === 0) {
        return [];
      }
      
      // Get the current date in YYYYMMDD format
      const today = new Date();
      const dateString = today.getFullYear() + 
        String(today.getMonth() + 1).padStart(2, '0') + 
        String(today.getDate()).padStart(2, '0');
      
      // Get all CSV files for today
      const files = fs.readdirSync(this.exportPath)
        .filter(file => file.startsWith(dateString) && file.endsWith('.csv'))
        .map(file => path.join(this.exportPath, file))
        .sort((a, b) => {
          // Sort by modification time (newest first)
          return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
        });
      
      if (files.length === 0) {
        return [];
      }
      
      // Parse the latest file
      const latestFile = files[0];
      const scans = await this._parseCSVFile(latestFile);
      
      this.logger.info('Retrieved today\'s scans', { 
        file: latestFile, 
        count: scans.length 
      });
      
      return scans;
    } catch (error) {
      this.logger.error('Error getting today\'s scans', { error: error.message });
      return [];
    }
  }

  /**
   * Parse a CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} Parsed data
   * @private
   */
  _parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(this._processRow(data)))
        .on('end', () => {
          this.logger.debug('CSV file parsed', { file: filePath, rows: results.length });
          resolve(results);
        })
        .on('error', (error) => {
          this.logger.error('Error parsing CSV file', { error: error.message, file: filePath });
          reject(error);
        });
    });
  }

  /**
   * Process a row from the CSV file
   * @param {Object} row - CSV row
   * @returns {Object} Processed data
   * @private
   */
  _processRow(row) {
    // Map CSV columns to our data model
    // Adjust this based on the actual CSV format from Scan-ID
    return {
      scanTime: row.ScanTime || row.scanTime || row['Scan Time'] || '',
      firstName: row.FirstName || row.firstName || row['First Name'] || '',
      lastName: row.LastName || row.lastName || row['Last Name'] || '',
      dateOfBirth: row.DOB || row.dob || row.DateOfBirth || row['Date of Birth'] || '',
      idNumber: row.IDNumber || row.idNumber || row['ID Number'] || '',
      idType: row.IDType || row.idType || row['ID Type'] || '',
      idState: row.IDState || row.idState || row['ID State'] || '',
      idCountry: row.IDCountry || row.idCountry || row['ID Country'] || '',
      address: row.Address || row.address || '',
      city: row.City || row.city || '',
      state: row.State || row.state || '',
      zipCode: row.ZipCode || row.zipCode || row['Zip Code'] || '',
      rawData: row // Keep the original row for reference
    };
  }

  /**
   * Set export path
   * @param {string} path - Export path
   */
  setExportPath(path) {
    if (path && typeof path === 'string') {
      this.exportPath = path;
      this.settings.updateSetting('scanIdPath', path);
      this.logger.info('Scan-ID export path updated', { path });
    }
  }

  /**
   * Get export path
   * @returns {string} Export path
   */
  getExportPath() {
    return this.exportPath;
  }

  /**
   * Get scan data for a specific date
   * @param {Date} date - Date to get scans for
   * @returns {Promise<Array>} Scan data
   */
  async getScansForDate(date) {
    try {
      if (!this.exportPath || !fs.existsSync(this.exportPath)) {
        return [];
      }
      
      // Format date as YYYYMMDD
      const dateString = date.getFullYear() + 
        String(date.getMonth() + 1).padStart(2, '0') + 
        String(date.getDate()).padStart(2, '0');
      
      // Get all CSV files for the date
      const files = fs.readdirSync(this.exportPath)
        .filter(file => file.startsWith(dateString) && file.endsWith('.csv'))
        .map(file => path.join(this.exportPath, file))
        .sort((a, b) => {
          // Sort by modification time (newest first)
          return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
        });
      
      if (files.length === 0) {
        return [];
      }
      
      // Parse all files for the date
      const allScans = [];
      
      for (const file of files) {
        const scans = await this._parseCSVFile(file);
        allScans.push(...scans);
      }
      
      this.loggerService.info(`Retrieved scans for ${dateString}`, { 
        files: files.length, 
        scans: allScans.length 
      });
      
      return allScans;
    } catch (error) {
      this.loggerService.error(`Error getting scans for date`, { 
        error: error.message,
        date: date.toISOString()
      });
      return [];
    }
  }

  /**
   * Process scan data
   * @param {Object} scanData - Scan data
   * @returns {Promise<Object>} Processed data
   */
  async processScanData(scanData) {
    this.loggerService.debug('Processing scan data', { scanData });
    // TODO: Implement actual scan processing logic
    return { success: true, data: {} };
  }
}

module.exports = ScanIDService;
