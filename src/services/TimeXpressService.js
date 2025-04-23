/**
 * TimeXpressService.js
 * Handles integration with TimeXpress time clock system
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3');
const Logger = require('../core/Logger');
const Settings = require('../core/Settings');
const PlatformHelper = require('../utils/PlatformHelper');

const LoggerService = require('./LoggerService');

class TimeXpressService {
  constructor() {
    this.logger = new LoggerService('TimeXpressService');
    this.settings = new Settings();
    this.platform = new PlatformHelper();
    this.dbPath = null;
    this.db = null;
    this.initialize();
  }

  /**
   * Initialize the service
   */
  initialize() {
    try {
      const settings = this.settings.getSettings();
      this.dbPath = settings.timeClockDb || '';
      
      if (!this.dbPath) {
        // Try to find TimeXpress database in default locations
        const possiblePaths = this.platform.getTimeXpressPaths();
        this.dbPath = this.platform.findFirstExistingPath(possiblePaths);
        
        if (this.dbPath) {
          // Save the found path to settings
          this.settings.updateSetting('timeClockDb', this.dbPath);
          this.logger.info('Found TimeXpress database', { path: this.dbPath });
        } else {
          this.logger.warn('TimeXpress database not found in default locations');
        }
      }
      
      if (this.dbPath && fs.existsSync(this.dbPath)) {
        this.logger.info('TimeXpress service initialized', { path: this.dbPath });
      }
    } catch (error) {
      this.logger.error('Failed to initialize TimeXpress service', { error: error.message });
    }
  }

  /**
   * Check connection to TimeXpress
   * @returns {Promise<Object>} Connection status
   */
  async checkConnection() {
    try {
      if (!this.dbPath) {
        return { 
          success: false, 
          error: 'Database path not configured' 
        };
      }
      
      if (!fs.existsSync(this.dbPath)) {
        return { 
          success: false, 
          error: `Database file not found: ${this.dbPath}` 
        };
      }
      
      // Try to open the database
      let testDb = null;
      try {
        testDb = new sqlite3(this.dbPath, { readonly: true });
        
        // Test a simple query
        const result = testDb.prepare('SELECT 1 AS test').get();
        
        if (result && result.test === 1) {
          this.logger.info('TimeXpress connection successful', { path: this.dbPath });
          
          return { 
            success: true,
            data: {
              path: this.dbPath,
              version: this._getDatabaseVersion(testDb)
            }
          };
        } else {
          throw new Error('Database query failed');
        }
      } catch (dbError) {
        this.logger.error('Error connecting to TimeXpress database', { error: dbError.message });
        return { 
          success: false, 
          error: dbError.message 
        };
      } finally {
        if (testDb) {
          testDb.close();
        }
      }
    } catch (error) {
      this.logger.error('Error checking TimeXpress connection', { error: error.message });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get database version
   * @param {Object} db - Database connection
   * @returns {string} Database version
   * @private
   */
  _getDatabaseVersion(db) {
    try {
      // Try to get version from database
      // This is a placeholder - adjust based on actual TimeXpress schema
      const versionQuery = db.prepare('PRAGMA user_version').get();
      return versionQuery ? `${versionQuery.user_version}` : 'Unknown';
    } catch (error) {
      this.logger.debug('Could not determine database version', { error: error.message });
      return 'Unknown';
    }
  }

  /**
   * Connect to the database
   * @returns {boolean} Success status
   * @private
   */
  _connect() {
    if (this.db) {
      return true;
    }
    
    try {
      if (!this.dbPath || !fs.existsSync(this.dbPath)) {
        this.logger.error('Cannot connect to TimeXpress database - path not found', { path: this.dbPath });
        return false;
      }
      
      this.db = new sqlite3(this.dbPath, { readonly: true });
      this.logger.debug('Connected to TimeXpress database', { path: this.dbPath });
      return true;
    } catch (error) {
      this.logger.error('Error connecting to TimeXpress database', { error: error.message });
      return false;
    }
  }

  /**
   * Disconnect from the database
   * @private
   */
  _disconnect() {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        this.logger.debug('Disconnected from TimeXpress database');
      } catch (error) {
        this.logger.error('Error disconnecting from TimeXpress database', { error: error.message });
      }
    }
  }

  /**
   * Get employees
   * @returns {Promise<Array>} Employees
   */
  async getEmployees() {
    try {
      if (!this._connect()) {
        return [];
      }
      
      // This is a placeholder - adjust based on actual TimeXpress schema
      const query = this.db.prepare(`
        SELECT 
          id, 
          name, 
          employee_id, 
          department, 
          position, 
          status
        FROM employees
        ORDER BY name
      `);
      
      const employees = query.all();
      
      this.logger.info('Retrieved employees from TimeXpress', { count: employees.length });
      return employees;
    } catch (error) {
      this.logger.error('Error getting employees from TimeXpress', { error: error.message });
      return [];
    } finally {
      this._disconnect();
    }
  }

  /**
   * Get time clock entries for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Time clock entries
   */
  async getTimeEntries(startDate, endDate) {
    try {
      if (!this._connect()) {
        return [];
      }
      
      // Format dates for SQLite
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // This is a placeholder - adjust based on actual TimeXpress schema
      const query = this.db.prepare(`
        SELECT 
          id, 
          employee_id, 
          clock_in, 
          clock_out, 
          hours, 
          date
        FROM time_entries
        WHERE date BETWEEN ? AND ?
        ORDER BY date, clock_in
      `);
      
      const entries = query.all(startDateStr, endDateStr);
      
      this.logger.info('Retrieved time entries from TimeXpress', { 
        count: entries.length,
        startDate: startDateStr,
        endDate: endDateStr
      });
      
      return entries;
    } catch (error) {
      this.logger.error('Error getting time entries from TimeXpress', { error: error.message });
      return [];
    } finally {
      this._disconnect();
    }
  }

  /**
   * Get time clock entries for an employee
   * @param {string} employeeId - Employee ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Time clock entries
   */
  async getEmployeeTimeEntries(employeeId, startDate, endDate) {
    try {
      if (!this._connect()) {
        return [];
      }
      
      // Format dates for SQLite
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // This is a placeholder - adjust based on actual TimeXpress schema
      const query = this.db.prepare(`
        SELECT 
          id, 
          employee_id, 
          clock_in, 
          clock_out, 
          hours, 
          date
        FROM time_entries
        WHERE employee_id = ? AND date BETWEEN ? AND ?
        ORDER BY date, clock_in
      `);
      
      const entries = query.all(employeeId, startDateStr, endDateStr);
      
      this.logger.info('Retrieved employee time entries from TimeXpress', { 
        employeeId,
        count: entries.length,
        startDate: startDateStr,
        endDate: endDateStr
      });
      
      return entries;
    } catch (error) {
      this.logger.error('Error getting employee time entries from TimeXpress', { 
        error: error.message,
        employeeId
      });
      return [];
    } finally {
      this._disconnect();
    }
  }

  /**
   * Set database path
   * @param {string} path - Database path
   */
  setDatabasePath(path) {
    if (path && typeof path === 'string') {
      this.dbPath = path;
      this.settings.updateSetting('timeClockDb', path);
      this.logger.info('TimeXpress database path updated', { path });
    }
  }

  /**
   * Get database path
   * @returns {string} Database path
   */
  getDatabasePath() {
    return this.dbPath;
  }
}

module.exports = TimeXpressService;
