// db.js
// Sets up SQLite database and provides utility functions for the Front Desk Ops app

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database file path (in user data directory or project root for dev)
const dbPath = path.join(__dirname, '../../data/frontdeskops.sqlite3');
const db = new sqlite3.Database(dbPath);

// Initialize tables if they don't exist
function initializeDatabase() {
  db.serialize(() => {
    // Knowledge Base table
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Incidents table
    db.run(`CREATE TABLE IF NOT EXISTS incidents (
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
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      expiry_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Members table (for caching Wix member data)
    db.run(`CREATE TABLE IF NOT EXISTS members (
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
    db.run(`CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT,
      member_name TEXT,
      purpose TEXT,
      notes TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Staff table
    db.run(`CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

/**
 * Cache a member in the local database
 * @param {Object} member - Member data from Wix
 * @returns {Promise<Object>} - Result of the operation
 */
function cacheMember(member) {
  return new Promise((resolve, reject) => {
    try {
      // Extract member data, handling different property structures
      const wixId = member._id || member.wix_id;
      const firstName = member.contactInfo?.firstName || member.first_name || '';
      const lastName = member.contactInfo?.lastName || member.last_name || '';
      const email = member.loginEmail || member.email || '';
      const phone = member.contactInfo?.phone || member.phone || '';
      const status = member.membershipStatus || member.membership_status || 'UNKNOWN';
      const expiry = member.expirationDate || member.membership_expiry || null;
      
      // Check if member already exists
      db.get('SELECT id FROM members WHERE wix_id = ?', [wixId], (err, row) => {
        if (err) return reject(err);
        
        if (row) {
          // Update existing member
          db.run(
            `UPDATE members SET 
              first_name = ?, 
              last_name = ?, 
              email = ?, 
              phone = ?, 
              membership_status = ?, 
              membership_expiry = ?,
              last_sync = CURRENT_TIMESTAMP 
            WHERE wix_id = ?`,
            [firstName, lastName, email, phone, status, expiry, wixId],
            function(err) {
              if (err) return reject(err);
              resolve({ id: row.id, updated: true });
            }
          );
        } else {
          // Insert new member
          db.run(
            `INSERT INTO members 
              (wix_id, first_name, last_name, email, phone, membership_status, membership_expiry) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [wixId, firstName, lastName, email, phone, status, expiry],
            function(err) {
              if (err) return reject(err);
              resolve({ id: this.lastID, updated: false });
            }
          );
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Search for members in the local database
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} - Array of matching members
 */
function searchMembers(searchTerm) {
  return new Promise((resolve, reject) => {
    try {
      const searchPattern = `%${searchTerm}%`;
      
      db.all(
        `SELECT * FROM members 
         WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?`,
        [searchPattern, searchPattern, searchPattern, searchPattern],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get a member by ID
 * @param {string} memberId - Member ID
 * @returns {Promise<Object>} - Member object or null if not found
 */
function getMemberById(memberId) {
  return new Promise((resolve, reject) => {
    try {
      db.get('SELECT * FROM members WHERE wix_id = ?', [memberId], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add a check-in record
 * @param {Object} checkIn - Check-in data
 * @returns {Promise<Object>} - Result of the operation
 */
function addCheckIn(checkIn) {
  return new Promise((resolve, reject) => {
    try {
      // Get member name if available
      getMemberById(checkIn.memberId)
        .then(member => {
          const memberName = member ? 
            `${member.first_name} ${member.last_name}`.trim() : 
            'Unknown Member';
          
          db.run(
            `INSERT INTO check_ins (member_id, member_name, purpose, notes, timestamp) 
             VALUES (?, ?, ?, ?, ?)`,
            [checkIn.memberId, memberName, checkIn.purpose, checkIn.notes, checkIn.timestamp],
            function(err) {
              if (err) return reject(err);
              resolve({ id: this.lastID });
            }
          );
        })
        .catch(error => {
          // If we can't get the member, just use the ID
          db.run(
            `INSERT INTO check_ins (member_id, member_name, purpose, notes, timestamp) 
             VALUES (?, ?, ?, ?, ?)`,
            [checkIn.memberId, 'Unknown Member', checkIn.purpose, checkIn.notes, checkIn.timestamp],
            function(err) {
              if (err) return reject(err);
              resolve({ id: this.lastID });
            }
          );
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get recent check-ins
 * @param {number} limit - Maximum number of check-ins to return
 * @returns {Promise<Array>} - Array of check-ins
 */
function getRecentCheckIns(limit = 10) {
  return new Promise((resolve, reject) => {
    try {
      db.all(
        `SELECT * FROM check_ins ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
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
