// db.js
// Sets up SQLite database and provides utility functions for the Front Desk Ops app

const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const LoggerService = require('../utils/logger');
const electron = require('electron');
const app = electron.app || electron.remote.app;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path (in user data directory or project root for dev)
const dbPath = path.join(dataDir, 'frontdeskops.sqlite3');
LoggerService.info('Initializing database', { path: dbPath });
const db = new Database(dbPath, { verbose: LoggerService.debug });

// Initialize tables if they don't exist
function initializeDatabase() {
  LoggerService.info('Initializing database tables');
  
  try {
      // Knowledge Base table
      LoggerService.debug('Creating knowledge_base table if not exists');
      db.prepare(`CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      // Incidents table
      LoggerService.debug('Creating incidents table if not exists');
      db.prepare(`CREATE TABLE IF NOT EXISTS incidents (
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
      )`).run();
      
      // Announcements table
      LoggerService.debug('Creating announcements table if not exists');
      db.prepare(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        expiry_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      // Members table (for caching Wix member data)
      LoggerService.debug('Creating members table if not exists');
      db.prepare(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wix_id TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        membership_status TEXT,
        membership_expiry TEXT,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      // Check-ins table
      LoggerService.debug('Creating check_ins table if not exists');
      db.prepare(`CREATE TABLE IF NOT EXISTS check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT,
        member_name TEXT,
        purpose TEXT,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      // Staff table
      LoggerService.debug('Creating staff table if not exists');
      db.prepare(`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`).run();
      
      LoggerService.info('Database tables initialized successfully');
} catch (error) {
  LoggerService.error('Error initializing database tables:', { error: error.message, stack: error.stack });
  throw error;
}
}



/**
 * Search for members in the local database
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} - Array of matching members
 */
function searchMembers(searchTerm) {
  try {
    LoggerService.debug('Searching members in local database', { searchTerm });
    const searchPattern = `%${searchTerm}%`;
    const stmt = db.prepare(
      `SELECT * FROM members 
       WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?`
    );
    const rows = stmt.all(searchPattern, searchPattern, searchPattern, searchPattern);
    const count = rows ? rows.length : 0;
    LoggerService.info('Local database search completed', { searchTerm, resultsCount: count });
    if (count > 0) {
      LoggerService.debug('Search results summary', {
        searchTerm,
        count,
        firstResult: rows[0] ? `${rows[0].first_name} ${rows[0].last_name}`.trim() : 'N/A'
      });
    }
    return rows || [];
  } catch (error) {
    LoggerService.error('Error in searchMembers function:', { searchTerm, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Get a member by ID
 * @param {string} memberId - Member ID
 * @returns {Promise<Object>} - Member object or null if not found
 */
function getMemberById(memberId) {
  try {
    const stmt = db.prepare('SELECT * FROM members WHERE wix_id = ?');
    const row = stmt.get(memberId);
    return row || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Add a check-in record
 * @param {Object} checkIn - Check-in data
 * @returns {Promise<Object>} - Result of the operation
 */
function addCheckIn(checkIn) {
  try {
    // Get member name if available
    let memberName = 'Unknown Member';
    try {
      const member = getMemberById(checkIn.memberId);
      if (member) {
        memberName = `${member.first_name} ${member.last_name}`.trim();
      }
    } catch (error) {
      // If error, use Unknown Member
    }
    const stmt = db.prepare(
      `INSERT INTO check_ins (member_id, member_name, purpose, notes, timestamp) 
       VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(checkIn.memberId, memberName, checkIn.purpose, checkIn.notes, checkIn.timestamp);
    LoggerService.info('Check-in added successfully', { id: info.lastInsertRowid });
    return { id: info.lastInsertRowid };
  } catch (error) {
    throw error;
  }
}

/**
 * Get recent check-ins
 * @param {number} limit - Maximum number of check-ins to return
 * @returns {Promise<Array>} - Array of check-ins
 */
function getRecentCheckIns(limit = 10) {
  try {
    const stmt = db.prepare(`SELECT * FROM check_ins ORDER BY timestamp DESC LIMIT ?`);
    const rows = stmt.all(limit);
    return rows || [];
  } catch (error) {
    throw error;
  }
}
/**
 * Cache a member in the local database (better-sqlite3, synchronous)
 * @param {Object} member - Member data from Wix
 * @returns {Object} - Result of the operation
 */
function cacheMember(member) {
  try {
    // Validate and sanitize input
    if (!member || typeof member !== 'object') {
      logger.error('Invalid member object provided to cacheMember', { member });
      return { success: false, error: 'Invalid member object' };
    }
    // Defensive destructuring and fallback values
    const wixId = member.id || member.wix_id || '';
    const firstName = member.firstName || member.first_name || '';
    const lastName = member.lastName || member.last_name || '';
    const email = member.email || '';
    const phone = member.phone || '';
    const status = member.membershipStatus || member.membership_status || '';
    const expiry = member.membershipExpiry || member.membership_expiry || '';

    if (!wixId) {
      logger.error('Missing wixId for member in cacheMember', { member });
      return { success: false, error: 'Missing wixId for member' };
    }

    logger.debug('Caching member in local database', { wixId });
    const stmt = db.prepare(`INSERT OR REPLACE INTO members (wix_id, first_name, last_name, email, phone, membership_status, membership_expiry, last_sync) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);
    stmt.run(wixId, firstName, lastName, email, phone, status, expiry);
    logger.info('Member cached successfully', { wixId });
    return { success: true };
  } catch (error) {
    logger.error('Error caching member:', { error: error.message, stack: error.stack, member });
    return { success: false, error: error.message };
  }
}

// Export database and functions
module.exports = {
  db,
  initDatabase: initializeDatabase,
  initializeDatabase,
  cacheMember,
  searchMembers,
  getMemberById,
  addCheckIn,
  getRecentCheckIns
};
