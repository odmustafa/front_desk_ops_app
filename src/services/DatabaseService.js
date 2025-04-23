// services/DatabaseService.js
// Handles SQLite database connection and queries

const LoggerService = require('./LoggerService');

class DatabaseService {
  constructor(sqlite3, dbPath, logger) {
    this.sqlite3 = sqlite3;
    this.dbPath = dbPath;
    this.logger = logger || new LoggerService('DatabaseService');
    this.db = null;
  }

  connect() {
    if (!this.db) {
      this.db = new this.sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error('Failed to connect to database', { error: err.message });
        } else {
          this.logger.info('Connected to SQLite database', { dbPath: this.dbPath });
          this.initializeTables();
        }
      });
    }
    return this.db;
  }

  initializeTables() {
    // Create all required tables if they don't exist
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reported_by TEXT,
        description TEXT,
        location TEXT,
        incident_type TEXT,
        incident_date TEXT,
        incident_time TEXT,
        action_taken TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT,
        expiry_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT,
        member_name TEXT,
        purpose TEXT,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wix_id TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    for (const stmt of tableStatements) {
      try {
        this.db.prepare(stmt).run();
        this.logger.debug('Ensured table exists', { statement: stmt });
      } catch (err) {
        this.logger.error('Failed to create table', { error: err.message, statement: stmt });
      }
    }
  }

  checkConnection() {
    return new Promise((resolve, reject) => {
      this.connect();
      this.db.get('SELECT 1', (err) => {
        if (err) {
          this.logger.error('Database connection failed', { error: err.message });
          resolve({ success: false, error: err.message });
        } else {
          this.logger.info('Database connection successful');
          resolve({ success: true });
        }
      });
    });
  }

  // Add more query methods as needed
}

module.exports = DatabaseService;
