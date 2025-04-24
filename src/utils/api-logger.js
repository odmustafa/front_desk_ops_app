/**
 * API Logger Utility
 * Provides structured logging for API requests and responses
 */


const axios = require('axios');

const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('ApiLogger');
// Create an axios interceptor to log all requests and responses
const setupAxiosLogging = () => {
  // Request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Add timestamp for duration tracking
      config.requestTimestamp = Date.now();
      
      // Skip logging for Seq API calls to avoid recursion
      if (isSeqApiCall(config.url)) {
        return config;
      }
      
      // Create a structured log of the request
      const requestLog = {
        request: {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: sanitizeHeaders(config.headers),
          data: sanitizeData(config.data),
          params: config.params
        },
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
        apiName: extractApiName(config.url)
      };
      
      // Add the request ID to the config for later reference in the response
      config.requestId = requestLog.requestId;
      
      // Log the request
      logger.debug('API Request', requestLog);
      
      return config;
    },
    (error) => {
      logger.error('API Request Error', {
        error: error.message,
        stack: error.stack
      });
      return Promise.reject(error);
    }
  );
  
  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      // Skip logging for Seq API calls to avoid recursion
      if (isSeqApiCall(response.config.url)) {
        return response;
      }
      
      // Create a structured log of the response
      const responseLog = {
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: sanitizeHeaders(response.headers),
          data: sanitizeData(response.data)
        },
        request: {
          method: response.config.method?.toUpperCase(),
          url: response.config.url
        },
        requestId: response.config.requestId || 'unknown',
        timestamp: new Date().toISOString(),
        apiName: extractApiName(response.config.url),
        durationMs: calculateDuration(response.config)
      };
      
      // Log the response
      logger.debug('API Response', responseLog);
      
      return response;
    },
    (error) => {
      // Skip logging for Seq API calls to avoid recursion
      if (error.config && isSeqApiCall(error.config.url)) {
        return Promise.reject(error);
      }
      
      // Log error responses
      const errorLog = {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        },
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: sanitizeHeaders(error.response.headers),
          data: sanitizeData(error.response.data)
        } : null,
        request: error.config ? {
          method: error.config.method?.toUpperCase(),
          url: error.config.url
        } : null,
        requestId: error.config?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
        apiName: error.config ? extractApiName(error.config.url) : 'unknown',
        durationMs: error.config ? calculateDuration(error.config) : null
      };
      
      logger.error('API Response Error', errorLog);
      
      return Promise.reject(error);
    }
  );
};

/**
 * Generate a unique request ID
 * @returns {string} Unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Extract API name from URL
 * @param {string} url - Request URL
 * @returns {string} API name
 */
const extractApiName = (url) => {
  if (!url) return 'unknown';
  
  try {
    // Try to extract the domain
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Extract API name from domain
    if (domain.includes('wixapis')) return 'Wix API';
    if (domain.includes('github')) return 'GitHub API';
    if (domain.includes('tributeseq')) return 'Seq API';
    
    // Default to domain
    return domain;
  } catch (error) {
    // If URL parsing fails, extract from string
    if (url.includes('wixapis')) return 'Wix API';
    if (url.includes('github')) return 'GitHub API';
    if (url.includes('tributeseq')) return 'Seq API';
    
    return 'unknown';
  }
};

/**
 * Calculate request duration
 * @param {Object} config - Axios request config
 * @returns {number|null} Duration in milliseconds
 */
const calculateDuration = (config) => {
  if (config && config.requestTimestamp) {
    return Date.now() - config.requestTimestamp;
  }
  return null;
};

/**
 * Sanitize headers to remove sensitive information
 * @param {Object} headers - Request or response headers
 * @returns {Object} Sanitized headers
 */
const sanitizeHeaders = (headers) => {
  if (!headers) return {};
  
  const sanitized = { ...headers };
  
  // Redact sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'x-seq-apikey',
    'api-key',
    'apikey',
    'x-api-key',
    'cookie',
    'set-cookie'
  ];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
    
    // Check case-insensitive
    const headerKey = Object.keys(sanitized).find(
      key => key.toLowerCase() === header.toLowerCase()
    );
    
    if (headerKey && headerKey !== header) {
      sanitized[headerKey] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Sanitize request/response data to remove sensitive information
 * @param {any} data - Request or response data
 * @returns {any} Sanitized data
 */
const sanitizeData = (data) => {
  if (!data) return null;
  
  // If data is a string, check if it's JSON
  if (typeof data === 'string') {
    try {
      const jsonData = JSON.parse(data);
      return sanitizeObject(jsonData);
    } catch (e) {
      // Not JSON, return as is
      return data;
    }
  }
  
  // If data is an object, sanitize it
  if (typeof data === 'object') {
    return sanitizeObject(data);
  }
  
  return data;
};

/**
 * Sanitize an object to remove sensitive information
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Create a copy to avoid modifying the original
  const sanitized = { ...obj };
  
  // Sensitive field names
  const sensitiveFields = [
    'password',
    'token',
    'api_key',
    'apiKey',
    'secret',
    'credential',
    'auth',
    'key'
  ];
  
  // Recursively sanitize the object
  Object.keys(sanitized).forEach(key => {
    // Check if this is a sensitive field
    const isSensitive = sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  });
  
  return sanitized;
};

// Initialize axios interceptors
setupAxiosLogging();

/**
 * Check if a URL is a Seq API call
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is a Seq API call
 */
const isSeqApiCall = (url) => {
  if (!url) return false;
  
  return url.includes('tributeseq.azurewebsites.net') || 
         url.includes('seq.') || 
         url.includes('/api/events') ||
         (url.includes('localhost') && url.includes(':5341'));
};

module.exports = {
  setupAxiosLogging
};
