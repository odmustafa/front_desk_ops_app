// integrations.js
// Utility functions for integrating with external systems: MS SQL (TimeXpress), Scan-ID, Wix CMS

const mssql = require('mssql');
const axios = require('axios');
const fs = require('fs');
const csvParse = require('csv-parse');

// --- TimeXpress (MS SQL) ---
async function fetchTimeXpressData(config, query) {
  // config: { user, password, server, database, ... }
  try {
    let pool = await mssql.connect(config);
    let result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    console.error('TimeXpress MS SQL error:', err);
    return [];
  }
}

// --- Scan-ID (CSV Import Example) ---
function importScanIDCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParse({ columns: true }))
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// --- Wix CMS (REST API) ---
async function fetchWixCMSData(apiUrl, apiKey) {
  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: apiKey }
    });
    return response.data;
  } catch (err) {
    console.error('Wix CMS API error:', err);
    return null;
  }
}

module.exports = {
  fetchTimeXpressData,
  importScanIDCsv,
  fetchWixCMSData
};
