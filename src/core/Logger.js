/**
 * Logger.js
 * Centralized structured logging using Pino for the Tribute Front Desk Ops application.
 *
 * Usage:
 *   const logger = require('./Logger');
 *   const log = logger.createLogger('MyClass');
 *   log.info('message', { key: value });
 *
 * All logs go to both the console and Seq (if configured in settings).
 */
const pino = require('pino');
const pinoSeq = require('pino-seq');
const pinoCaller = require('pino-caller');
const SettingsManager = require('../services/SettingsManager');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pretty = require('pino-pretty');

// Read app version from package.json
let appVersion = 'unknown';
try {
  const pkgPath = path.join(__dirname, '../../package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    appVersion = pkg.version || 'unknown';
  }
} catch (err) {
  // ignore, fallback to 'unknown'
}

const machineName = os.hostname();
const platform = process.platform;
const appPath = process.cwd();
const electronVersion = process.versions.electron || 'n/a';
const nodeVersion = process.versions.node || process.version || 'n/a';
const osVersion = os.release();
const environment = process.env.NODE_ENV || 'development';
const processId = process.pid;

// Load Seq logging config from seq-logging.json
let seqSettings = {
  seqLoggingEnabled: false,
  seqUrl: 'http://localhost:5341',
  seqApiKey: '',
  seqMinLogLevel: 'debug',
  appName: 'FrontDeskOps',
};
try {
  const seqConfigPath = path.join(__dirname, '../config/seq-logging.json');
  if (fs.existsSync(seqConfigPath)) {
    const raw = fs.readFileSync(seqConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    seqSettings = { ...seqSettings, ...parsed };
  }
} catch (err) {
  // Fallback to defaults if seq-logging.json cannot be loaded
}

// Optionally load general app settings if needed elsewhere
let settings = {};
try {
  const settingsManager = new SettingsManager();
  settings = settingsManager.loadSettings();
} catch (error) {
  settings = {};
}

// Create Pino destination streams with level filtering
const streams = [
  {
    stream: pretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname', // Hide less relevant fields
      singleLine: false,
      // You can add more pretty options here
    }),
    level: 'trace',
  },
];
if (seqSettings.seqLoggingEnabled) {
  streams.push({
    stream: pinoSeq.createStream({
      serverUrl: seqSettings.seqUrl,
      apiKey: seqSettings.seqApiKey,
    }),
    level: seqSettings.seqMinLogLevel || 'debug', // Use configured min log level
  });
}

// Main Pino logger instance
const pinoLogger = pino({
  level: 'trace', // Always emit everything, filtering is handled per-stream
  formatters: {
    level(label) { return { level: label }; },
    bindings(bindings) { return { pid: bindings.pid, hostname: bindings.hostname }; },
  },
  base: {
    app: seqSettings.appName || settings.appName || 'FrontDeskOps',
    AppVersion: appVersion,
    MachineName: machineName,
    Platform: platform,
    AppPath: appPath,
    ElectronVersion: electronVersion,
    NodeVersion: nodeVersion,
    OSVersion: osVersion,
    Environment: environment,
    ProcessId: processId,
  },
  timestamp: pino.stdTimeFunctions.isoTime
}, pino.multistream(streams));

// Wrap logger with pino-caller to include file/line info
const loggerWithCaller = pinoCaller(pinoLogger);

module.exports = {
  logger: loggerWithCaller,
  createLogger: () => loggerWithCaller,
};