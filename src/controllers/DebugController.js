// controllers/DebugController.js
// Handles debug-related IPC and logic
class DebugController {
  constructor(ipcMain, loggerService, fs, path, app) {
    this.ipcMain = ipcMain;
    this.loggerService = loggerService;
    this.fs = fs;
    this.path = path;
    this.app = app;
  }

  registerIpcHandlers() {
    // Get application logs
    this.ipcMain.handle('debug:getLogs', async () => {
      this.loggerService.debug('Retrieving application logs');
      try {
        const logFiles = this.loggerService.getCurrentLogFiles ? this.loggerService.getCurrentLogFiles() : {
          projectLog: this.path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
        };
        if (this.fs.existsSync(logFiles.projectLog)) {
          const logContent = this.fs.readFileSync(logFiles.projectLog, 'utf8');
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
            .slice(-100);
          return logEntries;
        } else {
          this.loggerService.warn('Log file not found', { path: logFiles.projectLog });
          return [];
        }
      } catch (error) {
        this.loggerService.error('Error retrieving logs', { error: error.message });
        return [];
      }
    });

    // Clear application logs
    this.ipcMain.handle('debug:clearLogs', async () => {
      this.loggerService.debug('Clearing application logs');
      try {
        const logFiles = this.loggerService.getCurrentLogFiles ? this.loggerService.getCurrentLogFiles() : {
          projectLog: this.path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
        };
        if (this.fs.existsSync(logFiles.projectLog)) {
          this.fs.writeFileSync(logFiles.projectLog, '', 'utf8');
          this.loggerService.info('Logs cleared');
          return { success: true };
        } else {
          this.loggerService.warn('Log file not found', { path: logFiles.projectLog });
          return { success: false, error: 'Log file not found' };
        }
      } catch (error) {
        this.loggerService.error('Error clearing logs', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // Get system information
    this.ipcMain.handle('debug:getSystemInfo', async () => {
      this.loggerService.debug('Retrieving system information');
      try {
        const logFiles = this.loggerService.getCurrentLogFiles ? this.loggerService.getCurrentLogFiles() : {
          projectLog: this.path.join(__dirname, '../logs/debug-' + new Date().toISOString().split('T')[0] + '.log')
        };
        return {
          success: true,
          data: {
            appVersion: this.app.getVersion(),
            electronVersion: process.versions.electron,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            versions: process.versions,
            logPath: logFiles.projectLog
          }
        };
      } catch (error) {
        this.loggerService.error('Error retrieving system info', { error: error.message });
        return { success: false, error: error.message };
      }
    });
  }
}
module.exports = DebugController;
