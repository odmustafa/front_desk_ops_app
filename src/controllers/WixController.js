// controllers/WixController.js
// Handles Wix API and related IPC logic
class WixController {
  constructor(ipcMain, wixService, appSettings, logger, axios) {
    this.ipcMain = ipcMain;
    this.wixService = wixService;
    this.appSettings = appSettings;
    this.logger = logger;
    this.axios = axios;
  }

  registerIpcHandlers() {
    // Test simple API
    this.ipcMain.handle('wix:testSimpleApi', async () => {
      this.logger.debug('Running simple Wix API test');
      try {
        const wixApiKey = this.appSettings.wixApiKey || '';
        const wixSiteId = this.appSettings.wixSiteId || '';
        if (!wixApiKey || !wixSiteId) {
          this.logger.warn('Wix API credentials not configured for test');
          return { success: false, error: 'API credentials not configured' };
        }
        const response = await this.axios({
          method: 'GET',
          url: 'https://www.wixapis.com/site-properties/v4/properties',
          headers: {
            'Authorization': wixApiKey,
            'wix-site-id': wixSiteId,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        // If successful, return the response
        return { success: true, data: response.data };
      } catch (error) {
        this.logger.error('Wix API test failed', error);
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:initConfig
    this.ipcMain.handle('wix:initConfig', async (event, credentials) => {
      try {
        this.logger.info('Initializing Wix configuration');
        const wixCredentials = credentials || this.appSettings;
        this.logger.debug('Wix credentials provided', {
          siteId: wixCredentials.wixSiteId,
          hasApiKey: !!wixCredentials.wixApiKey
        });
        await this.wixService.initialize();
        return { success: true, config: wixCredentials };
      } catch (error) {
        this.logger.error('Error initializing Wix config:', { error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:testConnection
    this.ipcMain.handle('wix:testConnection', async () => {
      try {
        const result = await this.wixService.testConnection();
        result && result.success === true;
        return { success: true, connected: result };
      } catch (error) {
        this.logger.error('Error testing Wix connection:', error);
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:getMembers
    this.ipcMain.handle('wix:getMembers', async (event, filters) => {
      try {
        const members = await this.wixService.getMembers(100, 0, filters);
        return { success: true, members };
      } catch (error) {
        this.logger.error('Error fetching Wix members:', error);
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:searchMembers
    this.ipcMain.handle('wix:searchMembers', async (event, searchTerm) => {
      try {
        this.logger.info('Searching Wix members', { searchTerm });
        const members = await this.wixService.searchMembers(searchTerm);
        return { success: true, members };
      } catch (error) {
        this.logger.error('Error searching Wix members:', { searchTerm, error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:getMember
    this.ipcMain.handle('wix:getMember', async (event, memberId) => {
      try {
        this.logger.info('Getting member details', { memberId });
        let member = await this.wixService.getMemberById(memberId);
        if (!member) {
          this.logger.warn('Member not found in Wix API', { memberId });
          throw new Error(`Member with ID ${memberId} not found`);
        }
        return { success: true, member };
      } catch (error) {
        this.logger.error('Error getting member:', { memberId, error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:getEvents
    this.ipcMain.handle('wix:getEvents', async (event, limit) => {
      try {
        this.logger.info('Getting Wix events', { limit });
        return { success: false, error: 'Events functionality not yet implemented in new WixService' };
      } catch (error) {
        this.logger.error('Error fetching Wix events:', error);
        return { success: false, error: error.message };
      }
    });
    // Handler: wix:checkConnection
    this.ipcMain.handle('wix:checkConnection', async () => {
      this.logger.debug('Checking Wix connection');
      // Implement network and credential checks here if needed
      return { success: true, message: 'Wix connection check delegated to controller.' };
    });
    // Handler: timeXpress:checkConnection
    this.ipcMain.handle('timeXpress:checkConnection', async () => {
      this.logger.debug('Checking TimeXpress connection');
      // Implement real check if TimeXpressService supports it
      return { success: true, message: 'TimeXpress connection check not yet implemented.' };
    });
    // Handler: seq:checkConnection
    this.ipcMain.handle('seq:checkConnection', async () => {
      this.logger.debug('Checking Seq connection');
      // Implement real check if available
      return { success: true, message: 'Seq connection check not yet implemented.' };
    });
    // Add more Wix handlers as needed
  }
}
module.exports = WixController;
