// controllers/ScanIDController.js
// Handles Scan-ID related IPC and business logic
class ScanIDController {
  constructor(ipcMain, scanIDService, logger) {
    this.ipcMain = ipcMain;
    this.scanIDService = scanIDService;
    this.logger = logger;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('scanid:process', async (event, scanData) => {
      this.logger.debug('Processing Scan-ID data', { scanData });
      try {
        const result = await this.scanIDService.processScanData(scanData);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Error processing Scan-ID data', { error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Handler: scan-id (legacy CSV parsing)
    this.ipcMain.handle('scan-id', async (event, scanData) => {
      this.logger.debug('Processing ID scan data');
      // Implementation for legacy CSV scan-id logic should go here or be refactored into a service.
      return { success: false, error: 'Legacy scan-id handler not yet refactored.' };
    });
    // Handler: scanID:checkConnection
    this.ipcMain.handle('scanID:checkConnection', async () => {
      this.logger.debug('Checking ScanID connection');
      // Implement real connection check if ScanIDService supports it
      return { success: true, message: 'ScanID connection check not yet implemented.' };
    });
    // Add more Scan-ID handlers as needed
  }
}
module.exports = ScanIDController;
