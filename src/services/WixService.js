/**
 * WixService.js
 * Handles integration with Wix API for member management
 */
const axios = require('axios');
const Logger = require('../core/Logger');
const Settings = require('../core/Settings');

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
      const result = await this.authenticateWithApiKey();
      if (result) {
        this.logger.info('Authenticated with Wix API using API key');
        return true;
      }
      
      // Try OAuth token endpoint next
      const oauthResult = await this.authenticateWithOAuth();
      if (oauthResult) {
        this.logger.info('Authenticated with Wix API using OAuth');
        return true;
      }
      
      // Try bearer token authentication
      const bearerResult = await this.authenticateWithBearerToken();
      if (bearerResult) {
        this.logger.info('Authenticated with Wix API using bearer token');
        return true;
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
      
      if (!apiKey) {
        this.logger.warn('No API key configured');
        return false;
      }
      
      this.logger.debug('Authenticating with API key');
      
      // Create headers with API key
      const headers = {
        'Authorization': apiKey,
        'wix-site-id': settings.wixSiteId,
        'Content-Type': 'application/json'
      };
      
      // Test the API key with a simple request
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
        'wix-account-id': settings.wixAccountId,
        'Content-Type': 'application/json'
      };
      
      // Get member
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/v1/site-members/members/${memberId}`,
        headers,
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
        'wix-account-id': settings.wixAccountId,
        'Content-Type': 'application/json'
      };
      
      // Search members
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/v1/site-members/members/search`,
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
      const authResult = await this.authenticate();
      
      if (!authResult) {
        return { 
          success: false, 
          message: 'Authentication failed' 
        };
      }
      
      // Try to get a single member to test the connection
      const members = await this.getMembers(1, 0);
      
      return {
        success: true,
        authenticated: true,
        membersRetrieved: members.length > 0,
        tokenExpiry: this.tokenExpiry
      };
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
