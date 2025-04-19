// init.js
// This script initializes the SQLite database and verifies external integrations

const { initializeDatabase } = require('./db');
const { fetchTimeXpressData, importScanIDCsv, fetchWixCMSData } = require('./integrations');

// Initialize the local SQLite database tables
initializeDatabase();

console.log('SQLite database initialized.');

// Example usage (commented out):
// (Uncomment and fill in config/paths to test integrations)

// 1. Test TimeXpress (MS SQL) Integration
// const mssqlConfig = { user: 'username', password: 'password', server: 'localhost', database: 'TimeXpressDB' };
// fetchTimeXpressData(mssqlConfig, 'SELECT TOP 10 * FROM Attendance').then(console.log);

// 2. Test Scan-ID CSV Import
// importScanIDCsv('/path/to/scanid-export.csv').then(console.log);

// 3. Test Wix CMS API
// fetchWixCMSData('https://www.wixapis.com/cms/v1/collections/{collectionId}/items', 'your-wix-api-key').then(console.log);

module.exports = {};
