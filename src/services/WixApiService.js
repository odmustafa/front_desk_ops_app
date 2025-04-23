// WixApiService.js
// Handles all Wix API logic for Tribute Front Desk Ops App

class WixApiService {
  constructor(settingsManager, logger, axios) {
    this.settingsManager = settingsManager;
    this.logger = logger;
    this.axios = axios;
  }

  // Simple API connectivity test
  async testSimpleApi() {
    this.logger.debug('Running simple Wix API test');
    const settings = this.settingsManager.loadSettings();
    const wixApiKey = settings.wixApiKey || '';
    const wixSiteId = settings.wixSiteId || '';
    if (!wixApiKey || !wixSiteId) {
      this.logger.warn('Wix API credentials not configured for test');
      return { success: false, error: 'API credentials not configured' };
    }
    try {
      this.logger.debug('Making simple Wix API call to test connectivity');
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
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error('Wix API test failed', error);
      return {
        success: false,
        error: `API test failed: ${error.message}`,
        errorDetails: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }
      };
    }
  }

  // Additional Wix API methods (health check, member auth, etc.) can be added here
}

module.exports = WixApiService;
