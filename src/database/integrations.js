// integrations.js
// Utility functions for integrating with external systems: MS SQL (TimeXpress), Scan-ID, Wix CMS

const mssql = require('mssql');
const LoggerService = require('./LoggerService'); // Import LoggerService
const axios = require('axios');
const fs = require('fs');
const csvParse = require('csv-parse');

// --- TimeXpress (MS SQL) ---
async function fetchTimeXpressData(config, query) {
  // config: { user, password, server, database, ... }
  try {
    let pool = await mssql.connect(config);
    let result = await pool.request().query(query);
    LoggerService.debug('TimeXpress MS SQL query result:', result.recordset);
    return result.recordset;
  } catch (err) {
    LoggerService.error('TimeXpress MS SQL error:', err);
    return [];
  }
}

// --- Scan-ID (CSV Import Example) ---
function importScanIDCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParse({ columns: true }))
      .on('data', (row) => {
        LoggerService.info('Scan-ID CSV import row:', row);
        results.push(row);
      })
      .on('end', () => {
        LoggerService.info('Scan-ID CSV import complete:', results);
        resolve(results);
      })
      .on('error', (err) => {
        LoggerService.error('Scan-ID CSV import error:', err);
        reject(err);
      });
  });
}

// --- Wix CMS (REST API) ---
async function fetchWixCMSData(apiUrl, apiKey) {
  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: apiKey }
    });
    LoggerService.info('Wix CMS API response:', response.data);
    return response.data;
  } catch (err) {
    LoggerService.error('Wix CMS API error:', err);
    return null;
  }
}

module.exports = {
  fetchTimeXpressData,
  importScanIDCsv,
  fetchWixCMSData
};
