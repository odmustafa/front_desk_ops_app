// ipc/WixHandlers.js
// Registers IPC handlers related to Wix API integration

function registerWixHandlers(ipcMain, wixApiService, logger) {
  ipcMain.handle('wix:testSimpleApi', async () => {
    logger.debug('IPC: wix:testSimpleApi invoked');
    return await wixApiService.testSimpleApi();
  });

  // Add additional Wix IPC handlers here as you modularize further
}

module.exports = { registerWixHandlers };
