/**
 * S3Service.js
 * Handles integration with Cloudflare R2 (S3-compatible storage)
 */
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const Logger = require('../../core/Logger');
const Settings = require('../../core/Settings');

class S3Service {
  constructor() {
    const { createLogger } = require('../../core/Logger');
    this.logger = createLogger(this.constructor.name);
    this.settings = new Settings();
    this.client = null;
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize the S3 service
   */
  initialize() {
    try {
      const settings = this.settings.getSettings();
      
      // Check for required settings
      if (!settings.r2AccountId || !settings.r2AccessKeyId || !settings.r2SecretAccessKey || !settings.r2Bucket) {
        this.logger.warn('R2 credentials not configured');
        return;
      }
      
      // Create S3 client for Cloudflare R2
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${settings.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: settings.r2AccessKeyId,
          secretAccessKey: settings.r2SecretAccessKey
        }
      });
      
      this.bucket = settings.r2Bucket;
      this.initialized = true;
      this.logger.info('S3 service initialized for Cloudflare R2');
    } catch (error) {
      this.logger.error('Failed to initialize S3 service', { error: error.message });
    }
  }

  /**
   * Check if the service is initialized
   * @returns {boolean} Initialization status
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      this.logger.warn('S3 service not initialized');
      return false;
    }
    return true;
  }

  /**
   * Test connection to R2
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      if (!this._checkInitialized()) {
        return { 
          success: false, 
          error: 'S3 service not initialized' 
        };
      }
      
      // Try to list objects
      const command = new ListObjectsCommand({
        Bucket: this.bucket,
        MaxKeys: 1
      });
      
      const response = await this.client.send(command);
      
      this.logger.info('R2 connection successful');
      return { 
        success: true,
        data: {
          bucket: this.bucket,
          objects: response.Contents ? response.Contents.length : 0
        }
      };
    } catch (error) {
      this.logger.error('Error testing R2 connection', { error: error.message });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Upload a file to R2
   * @param {string} filePath - Local file path
   * @param {string} key - Object key (path in bucket)
   * @param {Object} metadata - Object metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(filePath, key, metadata = {}) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'S3 service not initialized' };
      }
      
      if (!fs.existsSync(filePath)) {
        this.logger.error('File not found', { path: filePath });
        return { success: false, error: 'File not found' };
      }
      
      // Read file
      const fileContent = fs.readFileSync(filePath);
      
      // Upload file
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ContentType: this._getContentType(filePath),
        Metadata: metadata
      });
      
      await this.client.send(command);
      
      this.logger.info('File uploaded to R2', { key });
      return { 
        success: true,
        data: {
          key,
          size: fileContent.length,
          bucket: this.bucket
        }
      };
    } catch (error) {
      this.logger.error('Error uploading file to R2', { 
        error: error.message,
        file: filePath,
        key
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Upload data to R2
   * @param {Buffer|string} data - Data to upload
   * @param {string} key - Object key (path in bucket)
   * @param {string} contentType - Content type
   * @param {Object} metadata - Object metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadData(data, key, contentType = 'application/octet-stream', metadata = {}) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'S3 service not initialized' };
      }
      
      // Upload data
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        Metadata: metadata
      });
      
      await this.client.send(command);
      
      this.logger.info('Data uploaded to R2', { key });
      return { 
        success: true,
        data: {
          key,
          size: data.length,
          bucket: this.bucket
        }
      };
    } catch (error) {
      this.logger.error('Error uploading data to R2', { 
        error: error.message,
        key
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Download a file from R2
   * @param {string} key - Object key
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Download result
   */
  async downloadFile(key, outputPath) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'S3 service not initialized' };
      }
      
      // Get object
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const response = await this.client.send(command);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write file
      const writeStream = fs.createWriteStream(outputPath);
      response.Body.pipe(writeStream);
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          this.logger.info('File downloaded from R2', { key, path: outputPath });
          resolve({ 
            success: true,
            data: {
              key,
              path: outputPath,
              contentType: response.ContentType,
              size: response.ContentLength
            }
          });
        });
        
        writeStream.on('error', (error) => {
          this.logger.error('Error writing downloaded file', { 
            error: error.message,
            key,
            path: outputPath
          });
          reject({ success: false, error: error.message });
        });
      });
    } catch (error) {
      this.logger.error('Error downloading file from R2', { 
        error: error.message,
        key
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get a signed URL for an object
   * @param {string} key - Object key
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<Object>} Signed URL result
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'S3 service not initialized' };
      }
      
      // Create command
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      // Generate signed URL
      const url = await getSignedUrl(this.client, command, { expiresIn });
      
      this.logger.info('Generated signed URL', { key, expiresIn });
      return { 
        success: true,
        data: {
          url,
          key,
          expiresIn
        }
      };
    } catch (error) {
      this.logger.error('Error generating signed URL', { 
        error: error.message,
        key
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * List objects in a bucket
   * @param {string} prefix - Prefix filter
   * @param {number} maxKeys - Maximum number of keys to return
   * @returns {Promise<Object>} List result
   */
  async listObjects(prefix = '', maxKeys = 1000) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'S3 service not initialized' };
      }
      
      // List objects
      const command = new ListObjectsCommand({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });
      
      const response = await this.client.send(command);
      
      this.logger.info('Listed objects in R2', { 
        prefix,
        count: response.Contents ? response.Contents.length : 0
      });
      
      return { 
        success: true,
        data: {
          objects: response.Contents || [],
          prefix,
          isTruncated: response.IsTruncated || false
        }
      };
    } catch (error) {
      this.logger.error('Error listing objects in R2', { 
        error: error.message,
        prefix
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Delete an object
   * @param {string} key - Object key
   * @returns {Promise<Object>} Delete result
   */
  async deleteObject(key) {
    try {
      if (!this._checkInitialized()) {
        return { success: false, error: 'S3 service not initialized' };
      }
      
      // Delete object
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      await this.client.send(command);
      
      this.logger.info('Deleted object from R2', { key });
      return { 
        success: true,
        data: {
          key,
          bucket: this.bucket
        }
      };
    } catch (error) {
      this.logger.error('Error deleting object from R2', { 
        error: error.message,
        key
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get content type based on file extension
   * @param {string} filePath - File path
   * @returns {string} Content type
   * @private
   */
  _getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

module.exports = S3Service;
