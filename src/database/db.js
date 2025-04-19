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
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reported_by TEXT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Add tables for members, staff, etc. as needed
  });
}

// Export database and init
module.exports = {
  db,
  initializeDatabase
};
