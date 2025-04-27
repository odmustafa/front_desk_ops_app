// controllers/OwncastController.js
// Handles OwnIPC and business logic
class OwncastController {
  constructor(ipcMain) {
    this.ipcMain = ipcMain;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('owncast-status', async (event) => {
      // TODO: Implement integration with Owncast server
      return { status: 'pending', message: 'Owncast integration pending implementation' };
    });
  }
}
module.exports = OwncastController;
