/**
 * Database.js
 * Manages SQLite database connection and operations
 * Uses better-sqlite3 for improved Windows compatibility
 */
const path = require('path');
const fs = require('fs');
const sqlite = require('better-sqlite3');
const { app } = require('electron');
const LoggerService = require('../services/LoggerService');
const PlatformHelper = require('../utils/PlatformHelper');

class Database {
  constructor() {
    this.logger = new LoggerService('Database');
    this.platform = new PlatformHelper();
    
    // Ensure data directory exists
    this.dataDir = path.join(app.getPath('userData'), 'data');
    this.platform.ensureDirectoryExists(this.dataDir);
    
    // Database file path
    this.dbPath = path.join(this.dataDir, 'frontdeskops.sqlite3');
    this.logger.info('Initializing database', { path: this.dbPath });
    
    // Database connection
    this.db = null;
    
    // Initialize database
    this.initialize();
  }
  
  /**
   * Initialize database
   */
  initialize() {
    try {
      // Open database connection
      this.db = new sqlite(this.dbPath, { verbose: this.logger.debug });
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Initialize tables
      this.initializeTables();
      
      this.logger.info('Database initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing database', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize database tables
   */
  initializeTables() {
    try {
      this.logger.info('Initializing database tables');
      
      // Knowledge Base table
      this.logger.debug('Creating knowledge_base table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Incidents table
      this.logger.debug('Creating incidents table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reported_by TEXT,
        description TEXT NOT NULL,
        location TEXT,
        incident_type TEXT,
        incident_date TEXT,
        incident_time TEXT,
        action_taken TEXT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Announcements table
      this.logger.debug('Creating announcements table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        expiry_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Members table (for caching Wix member data)
      this.logger.debug('Creating members table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wix_id TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        membership_status TEXT,
        membership_expiry TEXT,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Check-ins table
      this.logger.debug('Creating check_ins table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT,
        member_name TEXT,
        purpose TEXT,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Staff table
      this.logger.debug('Creating staff table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'active',
        shifts INTEGER DEFAULT 0,
        pay_rate TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Staff Schedule table
      this.logger.debug('Creating staff_schedule table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS staff_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        shift TEXT NOT NULL,
        time TEXT NOT NULL,
        register_staff_id INTEGER,
        rover_staff_id INTEGER,
        FOREIGN KEY (register_staff_id) REFERENCES staff (id),
        FOREIGN KEY (rover_staff_id) REFERENCES staff (id)
      )`);
      
      // Cloud Sync table
      this.logger.debug('Creating cloud_sync table if not exists');
      this.db.exec(`CREATE TABLE IF NOT EXISTS cloud_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        last_sync_attempt TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      this.logger.info('Database tables initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing database tables', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Execute a query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Query result
   */
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(params);
    } catch (error) {
      this.logger.error('Error executing query', { 
        error: error.message, 
        sql,
        params
      });
      throw error;
    }
  }
  
  /**
   * Get a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Row
   */
  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      this.logger.error('Error getting row', { 
        error: error.message, 
        sql,
        params
      });
      throw error;
    }
  }
  
  /**
   * Get multiple rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} Rows
   */
  all(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      this.logger.error('Error getting rows', { 
        error: error.message, 
        sql,
        params
      });
      throw error;
    }
  }
  
  /**
   * Begin a transaction
   * @returns {Object} Transaction
   */
  beginTransaction() {
    return this.db.transaction(() => {});
  }
  
  /**
   * Check database connection
   * @returns {boolean} Connection status
   */
  checkConnection() {
    try {
      // Try a simple query
      const result = this.get('SELECT 1 AS test');
      return result && result.test === 1;
    } catch (error) {
      this.logger.error('Database connection check failed', { error: error.message });
      return false;
    }
  }
  
  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      try {
        this.db.close();
        this.logger.info('Database connection closed');
      } catch (error) {
        this.logger.error('Error closing database connection', { error: error.message });
      }
    }
  }
  
  /**
   * Get database path
   * @returns {string} Database path
   */
  getDbPath() {
    return this.dbPath;
  }
  
  /**
   * Backup database
   * @param {string} backupPath - Backup path
   * @returns {boolean} Success status
   */
  backup(backupPath = null) {
    try {
      if (!backupPath) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        backupPath = path.join(this.dataDir, `backup-${timestamp}.sqlite3`);
      }
      
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      this.platform.ensureDirectoryExists(backupDir);
      
      // Create backup
      this.db.backup(backupPath);
      
      this.logger.info('Database backup created', { path: backupPath });
      return true;
    } catch (error) {
      this.logger.error('Error creating database backup', { error: error.message });
      return false;
    }
  }
}

module.exports = Database;
