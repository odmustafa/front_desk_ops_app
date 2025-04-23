// LoggerService.js
// Centralized logging for the Tribute Front Desk Ops App (Winston version)

const { createLogger, format, transports } = require('winston');
const SeqTransport = require('winston-seq');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Read app version and name from package.json
let appVersion = 'unknown';
let appName = 'FrontDeskOpsApp';
try {
  const pkgPath = path.join(__dirname, '../../package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    appVersion = pkg.version || 'unknown';
    appName = pkg.name || 'FrontDeskOpsApp';
  }
} catch (err) {}

const machineName = os.hostname();
const platform = process.platform;
const appPath = process.cwd();
const electronVersion = process.versions.electron || 'n/a';
const nodeVersion = process.versions.node || process.version || 'n/a';
const osVersion = os.release();
const environment = process.env.NODE_ENV || 'Development';
const processId = process.pid;
const environmentUserName = process.env.USERNAME || process.env.USER || '<Unknown>';

// Load Seq logging config from seq-logging.json
let seqSettings = {
  SeqLoggingEnabled: false,
  SeqUrl: 'http://localhost:5341',
  SeqApiKey: '',
  SeqMinLogLevel: 'debug',
  Application: appName,
};
try {
  const seqConfigPath = path.join(__dirname, '../config/seq-logging.json');
  if (fs.existsSync(seqConfigPath)) {
    const raw = fs.readFileSync(seqConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    seqSettings = { ...seqSettings, ...parsed };
  }
} catch (err) {}

// Winston format for PascalCase field transformation
function toPascalCase(str) {
  return str.replace(/(^|_|-|\s)(\w)/g, (_, __, c) => c ? c.toUpperCase() : '');
}
function pascalCaseMeta(meta) {
  const result = {};
  for (const key in meta) {
    if (Object.prototype.hasOwnProperty.call(meta, key)) {
      result[toPascalCase(key)] = meta[key];
    }
  }
  return result;
}

// Helper to get caller filename (fail-safe only)
function getCallerFile() {
  const origPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const err = new Error();
  const stack = err.stack;
  Error.prepareStackTrace = origPrepareStackTrace;
  const caller = stack && stack[3];
  if (caller && caller.getFileName) {
    return path.basename(caller.getFileName());
  }
  return 'UnknownFile';
}

// Winston format to enrich log info with C#-style fields
const enrichFormat = format((info, opts) => {
  // Prefer explicit context, then info.SourceContext, then fail-safe
  let sourceContext = info.Context || info.SourceContext;
  if (!sourceContext && opts && opts.context) sourceContext = opts.context;
  if (!sourceContext) {
    sourceContext = getCallerFile();
    info.FailSafeSourceContext = true;
  }

  // Attach all enrichers
  Object.assign(info, {
    Application: seqSettings.Application || appName,
    AssemblyInformationalVersion: appVersion,
    EnvironmentName: environment,
    EnvironmentUserName: environmentUserName,
    MachineName: machineName,
    MemoryUsage: process.memoryUsage().rss,
    ProcessId: processId,
    ProcessName: process.title,
    SourceContext: sourceContext,
    ThreadId: 1,
  });
  // PascalCase all fields (except message/timestamp/level for Winston/Seq compatibility)
  const stdFields = ['level','message','timestamp','stack'];
  const orig = { ...info };
  for (const key in orig) {
    if (!stdFields.includes(key)) {
      const pascal = toPascalCase(key);
      if (pascal !== key) {
        info[pascal] = orig[key];
        delete info[key];
      }
    }
  }
  return info;
});

// Console output format to match Serilog template
const consoleFormat = format.printf(({ timestamp, level, message, SourceContext, stack }) => {
  const levelU3 = level.toUpperCase().padEnd(3).slice(0, 3);
  const source = SourceContext || 'App';
  const exception = stack ? `\n${stack}` : '';
  return `[${timestamp} ${levelU3}][${source}]: ${message}${exception}`;
});

const loggerTransports = [
  new transports.Console({
    level: 'silly',
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      enrichFormat(),
      consoleFormat
    )
  })
];

if (seqSettings.SeqLoggingEnabled) {
  loggerTransports.push(new SeqTransport({
    serverUrl: seqSettings.SeqUrl,
    apiKey: seqSettings.SeqApiKey,
    level: seqSettings.SeqMinLogLevel || 'debug',
    onError: e => console.error('Seq logger error:', e),
    format: format.combine(
      format.timestamp(),
      enrichFormat()
    )
  }));
}

const winstonLogger = createLogger({
  level: 'silly',
  transports: loggerTransports
});

class LoggerService {
  /**
   * @param {string} context - SourceContext for all logs (script/module/class). Strongly recommended.
   */
  constructor(context) {
    this.context = context;
  }
  debug(message, meta = {}) {
    winstonLogger.debug(message, { ...meta, Context: this.context });
  }
  info(message, meta = {}) {
    winstonLogger.info(message, { ...meta, Context: this.context });
  }
  warn(message, meta = {}) {
    winstonLogger.warn(message, { ...meta, Context: this.context });
  }
  error(message, meta = {}) {
    winstonLogger.error(message, { ...meta, Context: this.context });
  }
}

module.exports = LoggerService;
