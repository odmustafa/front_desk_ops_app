/**
 * WixService.js
 * Handles integration with Wix API for member management
 */
const axios = require('axios');
const Logger = require('../core/Logger');
const Settings = require('../core/Settings');

// Ensure API logger is initialized
require('../utils/api-logger');

class WixService {
  constructor() {
    this.logger = new Logger('WixService');
    this.settings = new Settings();
    this.baseUrl = 'https://www.wixapis.com';
    this.authUrl = 'https://www.wix.com/oauth/access';
    this.timeout = 30000; // Increased timeout for better reliability
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Initialize the Wix service
   */
  async initialize() {
    try {
      this.logger.info('Initializing Wix service');
      await this.authenticate();
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Wix service', { error: error.message });
      return false;
    }
  }

  /**
   * Authenticate with Wix API using multiple approaches
   * Tries multiple authentication methods in sequence
   */
  async authenticate() {
    this.logger.debug('Authenticating with Wix API');
    
    try {
      // Try direct API key authentication first
      try {
        const result = await this.authenticateWithApiKey();
        if (result) {
          this.logger.info('Authenticated with Wix API using API key');
          return true;
        }
      } catch (apiKeyError) {
        this.logger.debug('API key authentication failed', { error: apiKeyError.message });
      }
      
      // Try OAuth token endpoint next
      try {
        const oauthResult = await this.authenticateWithOAuth();
        if (oauthResult) {
          this.logger.info('Authenticated with Wix API using OAuth');
          return true;
        }
      } catch (oauthError) {
        this.logger.debug('OAuth authentication failed', { error: oauthError.message });
      }
      
      // Try bearer token authentication
      try {
        const bearerResult = await this.authenticateWithBearerToken();
        if (bearerResult) {
          this.logger.info('Authenticated with Wix API using bearer token');
          return true;
        }
      } catch (bearerError) {
        this.logger.debug('Bearer token authentication failed', { error: bearerError.message });
      }
      
      this.logger.error('All Wix API authentication methods failed');
      return false;
    } catch (error) {
      this.logger.error('Authentication error', { 
        error: error.message, 
        stack: error.stack
      });
      return false;
    }
  }
  
  /**
   * Authenticate with direct API key
   * @returns {Promise<boolean>} Success status
   */
  async authenticateWithApiKey() {
    try {
      const settings = this.settings.getSettings();
      const apiKey = settings.wixApiKey;
      const siteId = settings.wixSiteId;
      
      if (!apiKey || !siteId) {
        this.logger.warn('No API key or site ID configured');
        return false;
      }
      
      this.logger.debug('Authenticating with API key');
      
      // Create headers with API key
      // Wix API expects the API key as a Bearer token
      const headers = {
        'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
        'wix-site-id': siteId,
        'Content-Type': 'application/json'
      };
      
      // Try multiple endpoints for authentication
      // First try the members endpoint which is documented in the Wix API
      try {
        this.logger.debug('Trying members endpoint for authentication');
        const membersResponse = await axios({
          method: 'get',
          url: `${this.baseUrl}/members/v1/members`,
          headers,
          params: {
            'fieldSet': 'PUBLIC',  // Use PUBLIC fieldset for basic member info
            'paging.limit': 10     // Limit to 10 members for connection test
          },
          timeout: this.timeout
        });
        
        if (membersResponse.status === 200) {
          this.logger.info('Successfully authenticated with API key via members endpoint', {
            siteId,
            membersCount: membersResponse.data?.members?.length || 0
          });
          this.token = apiKey;
          this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          return true;
        }
      } catch (membersError) {
        this.logger.debug('Members endpoint authentication failed', { 
          error: membersError.message,
          status: membersError.response?.status,
          data: membersError.response?.data
        });
        
        // Fall back to site endpoint
        try {
          this.logger.debug('Trying site endpoint for authentication');
          const siteResponse = await axios({
            method: 'get',
            url: `${this.baseUrl}/site/v1/sites/${siteId}`,
            headers,
            timeout: this.timeout
          });
          
          if (siteResponse.status === 200) {
            this.logger.info('Successfully authenticated with API key via site endpoint', {
              siteId,
              siteName: siteResponse.data?.site?.siteDisplayName || 'Unknown'
            });
            this.token = apiKey;
            this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            return true;
          }
        } catch (siteError) {
          this.logger.debug('Site endpoint authentication failed', { 
            error: siteError.message,
            status: siteError.response?.status,
            data: siteError.response?.data
          });
        }
      }
      
      this.logger.warn('All API key authentication methods failed');
      return false;
    } catch (error) {
      this.logger.debug('API key authentication failed', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }
  
  /**
   * Authenticate with OAuth token endpoint
   * @returns {Promise<boolean>} Success status
   */
  async authenticateWithOAuth() {
    try {
      const settings = this.settings.getSettings();
      const clientId = settings.wixClientId;
      const clientSecret = settings.wixApiSecret;
      
      if (!clientId || !clientSecret) {
        this.logger.warn('No OAuth credentials configured');
        return false;
      }
      
      this.logger.debug('Authenticating with OAuth');
      
      // Request body for OAuth token
      const data = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      };
      
      // Request token
      const response = await axios({
        method: 'post',
        url: `${this.authUrl}/token`,
        data,
        timeout: this.timeout
      });
      
      if (response.status === 200 && response.data.access_token) {
        this.token = response.data.access_token;
        this.tokenExpiry = new Date(Date.now() + (response.data.expires_in || 3600) * 1000);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.debug('OAuth authentication failed', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }
  
  /**
   * Authenticate with bearer token
   * @returns {Promise<boolean>} Success status
   */
  async authenticateWithBearerToken() {
    try {
      const settings = this.settings.getSettings();
      const apiKey = settings.wixApiKey;
      
      if (!apiKey) {
        this.logger.warn('No API key configured for bearer token');
        return false;
      }
      
      this.logger.debug('Authenticating with bearer token');
      
      // Create headers with bearer token
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'wix-account-id': settings.wixAccountId,
        'Content-Type': 'application/json'
      };
      
      // Test the bearer token with a simple request
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/v1/site-members/members`,
        headers,
        timeout: this.timeout
      });
      
      if (response.status === 200) {
        this.token = apiKey;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.debug('Bearer token authentication failed', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }
  
  /**
   * Check if token is valid
   * @returns {boolean} Token validity
   */
  isTokenValid() {
    return this.token && this.tokenExpiry && this.tokenExpiry > new Date();
  }
  
  /**
   * Get members from Wix
   * @param {number} limit - Maximum number of members to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Members
   */
  async getMembers(limit = 100, offset = 0) {
    try {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }
      
      const settings = this.settings.getSettings();
      
      // Create headers
      const headers = {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : `Bearer ${this.token}`,
        'wix-site-id': settings.wixSiteId,
        'wix-account-id': settings.wixAccountId,
        'Content-Type': 'application/json'
      };
      
      // Get members
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/v1/site-members/members?limit=${limit}&offset=${offset}`,
        headers,
        timeout: this.timeout
      });
      
      if (response.status === 200 && response.data.members) {
        this.logger.info('Retrieved members from Wix', { count: response.data.members.length });
        return response.data.members;
      }
      
      this.logger.warn('Failed to get members', { status: response.status });
      return [];
    } catch (error) {
      this.logger.error('Error getting members', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Try to re-authenticate on error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        this.logger.debug('Authentication expired, re-authenticating');
        await this.authenticate();
      }
      
      return [];
    }
  }
  
  /**
   * Get member by ID
   * @param {string} memberId - Member ID
   * @returns {Promise<Object|null>} Member
   */
  async getMemberById(memberId) {
    try {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }
      
      const settings = this.settings.getSettings();
      
      // Create headers
      const headers = {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : `Bearer ${this.token}`,
        'wix-site-id': settings.wixSiteId,
        'Content-Type': 'application/json'
      };
      
      // Get member
      // Based on Wix API documentation: https://dev.wix.com/docs/rest/crm/members-contacts/members/members/get-member
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/members/v1/members/${memberId}`,
        headers,
        params: {
          'fieldSet': 'FULL'  // Get full member details
        },
        timeout: this.timeout
      });
      
      if (response.status === 200 && response.data.member) {
        this.logger.info('Retrieved member from Wix', { id: memberId });
        return response.data.member;
      }
      
      this.logger.warn('Failed to get member', { status: response.status, id: memberId });
      return null;
    } catch (error) {
      this.logger.error('Error getting member by ID', { 
        error: error.message,
        id: memberId,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Try to re-authenticate on error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        this.logger.debug('Authentication expired, re-authenticating');
        await this.authenticate();
      }
      
      return null;
    }
  }
  
  /**
   * Search members
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of members to return
   * @returns {Promise<Array>} Members
   */
  async searchMembers(query, limit = 100) {
    try {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }
      
      const settings = this.settings.getSettings();
      
      // Create headers
      const headers = {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : `Bearer ${this.token}`,
        'wix-site-id': settings.wixSiteId,
        'Content-Type': 'application/json'
      };
      
      // Search members
      // Based on Wix API documentation: https://dev.wix.com/docs/rest/crm/members-contacts/members/members/search-members
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/members/v1/members/search`,
        headers,
        data: {
          query,
          limit
        },
        timeout: this.timeout
      });
      
      if (response.status === 200 && response.data.members) {
        this.logger.info('Searched members in Wix', { 
          query, 
          count: response.data.members.length 
        });
        return response.data.members;
      }
      
      this.logger.warn('Failed to search members', { status: response.status, query });
      return [];
    } catch (error) {
      this.logger.error('Error searching members', { 
        error: error.message,
        query,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Try to re-authenticate on error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        this.logger.debug('Authentication expired, re-authenticating');
        await this.authenticate();
      }
      
      return [];
    }
  }
  
  /**
   * Test connection to Wix API
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      // First, check if we can reach the Wix API at all
      let apiReachable = false;
      try {
        // Try the general health endpoint first
        const healthResponse = await axios({
          method: 'get',
          url: 'https://www.wixapis.com/health',
          timeout: 5000
        });
        apiReachable = healthResponse.status === 200;
        this.logger.debug('Wix API health check passed');
      } catch (healthError) {
        this.logger.warn('Wix API health check failed', { error: healthError.message });
        // Continue anyway, as the health endpoint might not be available
      }
      
      // Check if we have the required settings
      const settings = this.settings.getSettings();
      const siteId = settings.wixSiteId;
      const apiKey = settings.wixApiKey;
      
      if (!siteId || !apiKey) {
        return {
          success: false,
          message: 'Missing required Wix API credentials',
          details: {
            hasSiteId: !!siteId,
            hasApiKey: !!apiKey,
            apiReachable
          }
        };
      }
      
      // Try to authenticate
      let authResult = false;
      try {
        authResult = await this.authenticate();
      } catch (authError) {
        this.logger.error('Authentication error', { error: authError.message });
        return {
          success: false,
          message: 'Authentication process failed',
          error: authError.message,
          authenticated: false,
          apiReachable
        };
      }
      
      if (!authResult) {
        return { 
          success: false, 
          message: 'Authentication failed',
          details: 'Could not authenticate with any of the provided credentials',
          apiReachable
        };
      }
      
      // Try multiple endpoints to verify connectivity
      try {
        const headers = {
          'Authorization': this.token.startsWith('Bearer ') ? this.token : `Bearer ${this.token}`,
          'wix-site-id': siteId,
          'Content-Type': 'application/json'
        };
        
        // Try the members endpoint first
        try {
          const membersResponse = await axios({
            method: 'get',
            url: `${this.baseUrl}/members/v1/members`,
            headers,
            params: {
              'fieldSet': 'PUBLIC',  // Use PUBLIC fieldset for basic member info
              'paging.limit': 10     // Limit to 10 members for connection test
            },
            timeout: this.timeout
          });
          
          return {
            success: true,
            authenticated: true,
            apiReachable,
            endpoint: 'members',
            siteInfo: {
              id: siteId,
              membersCount: membersResponse.data?.members?.length || 0,
              membersAvailable: true
            },
            tokenExpiry: this.tokenExpiry
          };
        } catch (membersError) {
          this.logger.warn('Members endpoint test failed', { error: membersError.message });
          
          // Fall back to site endpoint
          try {
            const siteResponse = await axios({
              method: 'get',
              url: `${this.baseUrl}/site/v1/sites/${siteId}`,
              headers,
              timeout: this.timeout
            });
            
            return {
              success: true,
              authenticated: true,
              apiReachable,
              endpoint: 'site',
              siteInfo: {
                id: siteId,
                name: siteResponse.data?.site?.siteDisplayName || 'Unknown',
                url: siteResponse.data?.site?.url || 'Unknown'
              },
              tokenExpiry: this.tokenExpiry
            };
          } catch (siteError) {
            this.logger.error('Site endpoint test failed', { error: siteError.message });
            
            // We're authenticated but couldn't get site info from either endpoint
            return {
              success: true,
              authenticated: true,
              apiReachable,
              endpoint: 'none',
              siteInfo: null,
              errors: {
                members: membersError.message,
                site: siteError.message
              },
              tokenExpiry: this.tokenExpiry
            };
          }
        }
      } catch (error) {
        this.logger.error('Connection verification failed', { error: error.message });
        
        return {
          success: false,
          authenticated: true, // We authenticated but couldn't verify connection
          apiReachable,
          error: error.message,
          tokenExpiry: this.tokenExpiry
        };
      }
    } catch (error) {
      this.logger.error('Connection test failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        authenticated: false
      };
    }
  }
}

module.exports = WixService;
