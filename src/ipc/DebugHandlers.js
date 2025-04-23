// ipc/DebugHandlers.js
// Registers IPC handlers related to debugging and logs

// DebugHandlers.js is now deprecated. All debug-related IPC handlers are managed by DebugController.
// This file is kept for reference only.

/*
function registerDebugHandlers(ipcMain, logger, fs, path) {
  ipcMain.handle('debug:getLogs', async () => {
    logger.debug('Retrieving application logs');
    try {
      // Get current log file path
      const logFiles = logger.getCurrentLogFiles ? logger.getCurrentLogFiles() : {
        projectLog: path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
      };
      // Read log file
      if (fs.existsSync(logFiles.projectLog)) {
        const logContent = fs.readFileSync(logFiles.projectLog, 'utf8');
        // Parse log entries (simple parsing for demonstration)
        const logEntries = logContent.split('\n\n')
          .filter(entry => entry.trim() !== '')
          .map(entry => {
            const [timestamp, level, ...message] = entry.split('\n');
            return {
              timestamp,
              level,
              message: message.join('\n')
            };
          })
          .slice(-100); // Limit to last 100 entries
        return logEntries;
      } else {
        logger.warn('Log file not found', { path: logFiles.projectLog });
        return [];
      }
    } catch (error) {
      logger.error('Error retrieving logs', { error: error.message });
      return [];
    }
  });

  ipcMain.handle('debug:clearLogs', async () => {
    logger.debug('Clearing application logs');
    try {
      const logFiles = logger.getCurrentLogFiles ? logger.getCurrentLogFiles() : {
        projectLog: path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
      };
      if (fs.existsSync(logFiles.projectLog)) {
        fs.writeFileSync(logFiles.projectLog, '', 'utf8');
        logger.info('Logs cleared');
        return { success: true };
      } else {
        logger.warn('Log file not found', { path: logFiles.projectLog });
        return { success: false, error: 'Log file not found' };
      }
    } catch (error) {
      logger.error('Error clearing logs', { error: error.message });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('debug:getSystemInfo', async () => {
    logger.debug('Retrieving system information');
    try {
      return {
        success: true,
        data: {
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          versions: process.versions
        }
      };
    } catch (error) {
      logger.error('Error retrieving system info', { error: error.message });
      return { success: false, error: error.message };
    }
  });
}

*/
// module.exports = { registerDebugHandlers };

