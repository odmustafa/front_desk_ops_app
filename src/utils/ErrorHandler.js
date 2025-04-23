// utils/ErrorHandler.js
// Centralizes fatal error and uncaught exception handling

class ErrorHandler {
  static handleFatalError(error) {
    try {
      require('fs').writeFileSync('fatal-error.log', (error && error.stack) ? error.stack : String(error));
    } catch (e) {
      // Ignore file write errors
    }
    const LoggerService = require('../services/LoggerService');
    const logger = new LoggerService('ErrorHandler');
    logger.error('Fatal error in Electron main process:', { error });
    process.exit(1);
  }
}

module.exports = ErrorHandler;
