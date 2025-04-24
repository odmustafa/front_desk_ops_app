/**
 * PlatformHelper.js
 * Provides platform-specific utilities and detection
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Logger = require('../core/Logger');

class PlatformHelper {
  constructor() {
    const LoggerService = require('../services/LoggerService');
    this.logger = new LoggerService('PlatformHelper');
    this.isWindows = process.platform === 'win32';
    this.isMacOS = process.platform === 'darwin';
    this.isLinux = process.platform === 'linux';
    
    this.logger.info('Platform detected', {
      platform: process.platform,
      isWindows: this.isWindows,
      isMacOS: this.isMacOS,
      isLinux: this.isLinux,
      arch: process.arch
    });
  }
  
  /**
   * Get platform-specific path for Scan-ID exports
   * @returns {string} The default path for Scan-ID exports
   */
  getScanIDPath() {
    const homeDir = app.getPath('home');
    
    if (this.isWindows) {
      return path.join(homeDir, 'OneDrive', 'Documents', 'BCR', 'Scan-ID');
    } else if (this.isMacOS) {
      return path.join(homeDir, 'Documents', 'BCR', 'Scan-ID');
    } else {
      return path.join(homeDir, 'BCR', 'Scan-ID');
    }
  }
  
  /**
   * Get platform-specific paths for TimeXpress database
   * @returns {Array<string>} Possible paths for TimeXpress database
   */
  getTimeXpressPaths() {
    const homeDir = app.getPath('home');
    
    if (this.isWindows) {
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      
      return [
        path.join(programFiles, 'TimeXpress', 'Database', 'TimeXpress.db'),
        path.join(programFilesX86, 'TimeXpress', 'Database', 'TimeXpress.db'),
        path.join(homeDir, 'Documents', 'TimeXpress', 'Database', 'TimeXpress.db')
      ];
    } else if (this.isMacOS) {
      return [
        path.join(homeDir, 'Applications', 'TimeXpress', 'Database', 'TimeXpress.db')
      ];
    } else {
      return [
        path.join(homeDir, 'TimeXpress', 'Database', 'TimeXpress.db')
      ];
    }
  }
  
  /**
   * Find the first existing file from a list of paths
   * @param {Array<string>} paths - List of possible file paths
   * @returns {string|null} First existing path or null if none found
   */
  findFirstExistingPath(paths) {
    for (const possiblePath of paths) {
      if (fs.existsSync(possiblePath)) {
        this.logger.debug('Found existing path', { path: possiblePath });
        return possiblePath;
      }
    }
    return null;
  }
  
  /**
   * Create directory if it doesn't exist
   * @param {string} dirPath - Directory path
   * @returns {boolean} True if directory exists or was created
   */
  ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logger.debug('Created directory', { path: dirPath });
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to create directory', { path: dirPath, error: error.message });
      return false;
    }
  }
  
  /**
   * Get platform-specific path separator
   * @returns {string} Path separator
   */
  getPathSeparator() {
    return path.sep;
  }
  
  /**
   * Get platform-specific line ending
   * @returns {string} Line ending
   */
  getLineEnding() {
    return this.isWindows ? '\r\n' : '\n';
  }
  
  /**
   * Get platform-specific temp directory
   * @returns {string} Temp directory
   */
  getTempDirectory() {
    return app.getPath('temp');
  }
  
  /**
   * Get platform-specific user data directory
   * @returns {string} User data directory
   */
  getUserDataDirectory() {
    return app.getPath('userData');
  }
  
  /**
   * Get platform-specific documents directory
   * @returns {string} Documents directory
   */
  getDocumentsDirectory() {
    return app.getPath('documents');
  }
  
  /**
   * Get platform-specific executable path
   * @returns {string} Executable path
   */
  getExecutablePath() {
    return app.getPath('exe');
  }
}

module.exports = PlatformHelper;
