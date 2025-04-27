// Soul Beacon: This file is the ritual audit anchor for all system logging per the Ethereal Engineering Codex.
// All log events—material and symbolic—must pass through this structured logger. Maintain clarity, safety, and ethical alignment at all times.
/*
 * ░█▀█░█▀▀░█░█░█▀█░█▀█░█▀█░█▀▀░█▀▀░█▀█░█▀▄░█▀▀░█▄█
 * ░█▀▀░█▀▀░█▀█░█░█░█░█░█░█░█▀▀░█░░░█▀█░█▀▄░█▀▀░█░█
 * ░▀░░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░▀
 * Soul Beacon: Logging Ritual Integrity – v1.0
 *
 * Ethereal Engineering Codex: All logging herein is subject to reflective review and symbolic audit. Maintain clarity, safety, and ethical alignment at all times.
 */

// LoggerService.js
// Centralized logging for the Tribute Front Desk Ops App (Winston version)

const { createLogger, format, transports } = require('winston');
const { SeqTransport } = require('@datalust/winston-seq');
const os = require('os');

// App and environment metadata
const appName = 'FrontDeskOpsApp';
const environment = process.env.NODE_ENV || 'Development';
const machineName = os.hostname();
const environmentUserName = process.env.USERNAME || process.env.USER || '<Unknown>';

// Seq configuration (prefer env vars, fallback to defaults)
const seqUrl = process.env.SEQ_URL || 'https://tributeseq.azurewebsites.net';
const seqApiKey = process.env.SEQ_API_KEY || '';
const seqEnabled = process.env.SEQ_LOGGING_ENABLED === 'true' || true; // Default enabled
const seqMinLevel = process.env.SEQ_MIN_LOG_LEVEL || 'debug';

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
      format.colorize({ all: true }),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const source = meta.Context || meta.SourceContext || 'App';
        const stack = meta.stack ? `\n${meta.stack}` : '';
        return `[${timestamp} ${level}][${source}]: ${message}${stack}`;
      })
    )
  })
];

if (seqEnabled) {
  console.log(`[LoggerService] Seq logging ENABLED: ${seqUrl} (min level: ${seqMinLevel})`);
  loggerTransports.push(new SeqTransport({
    serverUrl: seqUrl,
    apiKey: seqApiKey,
    level: seqMinLevel,
    onError: e => process.stderr.write(`Seq logger error: ${e}\n`),
    handleExceptions: true,
    handleRejections: true
  }));
} else {
  console.log('[LoggerService] Seq logging DISABLED');
}

const winstonLogger = createLogger({
  level: 'silly',
  transports: loggerTransports,
  exitOnError: false
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
