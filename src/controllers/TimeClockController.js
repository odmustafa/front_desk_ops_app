// controllers/TimeClockController.js
// Handles Time Clock related IPC and business logic
class TimeClockController {
  constructor(ipcMain, timeClockService, logger) {
    this.ipcMain = ipcMain;
    this.timeClockService = timeClockService;
    this.logger = logger;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('timeclock:process', async (event, timeData) => {
      this.logger.debug('Processing time clock data', { timeData });
      try {
        const result = await this.timeClockService.processTimeData(timeData);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Error processing time clock data', { error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Legacy handler for pending TimeXpress integration
    this.ipcMain.handle('time-clock', async (event, timeData) => {
      // TODO: Implement integration with TimeXpress software
      this.logger.info('Processing time clock data (legacy)', { timeData });
      return { status: 'pending', message: 'Time Clock integration pending implementation' };
    });
    // Add more Time Clock handlers as needed
  }
}
module.exports = TimeClockController;
