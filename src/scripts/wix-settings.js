/**
 * Wix Settings and Integration Handler
 * Manages the Wix API configuration and integration with the Front Desk Ops app
 */

// Get Wix integration module
const wixIntegration = window.require ? window.require('../database/wix-integration.js') : null;

// DOM Elements
let wixSiteIdInput;
let wixApiKeyInput;
let wixApiSecretInput;
let testWixConnectionBtn;
let wixConnectionStatus;
let appSettingsForm;

/**
 * Initialize Wix settings UI
 */
function initializeWixSettings() {
    // Get DOM elements
    wixSiteIdInput = document.getElementById('wix-site-id');
    wixApiKeyInput = document.getElementById('wix-api-key');
    wixApiSecretInput = document.getElementById('wix-api-secret');
    testWixConnectionBtn = document.getElementById('test-wix-connection');
    wixConnectionStatus = document.getElementById('wix-connection-status');
    appSettingsForm = document.getElementById('app-settings-form');
    
    // Load saved Wix configuration
    loadWixConfig();
    
    // Set up event listeners
    if (testWixConnectionBtn) {
        testWixConnectionBtn.addEventListener('click', testWixConnection);
    }
    
    if (appSettingsForm) {
        appSettingsForm.addEventListener('submit', saveWixConfig);
    }
}

/**
 * Load saved Wix configuration
 */
function loadWixConfig() {
    if (!wixIntegration) return;
    
    try {
        const config = wixIntegration.loadWixConfig();
        if (config) {
            wixSiteIdInput.value = config.siteId || '';
            wixApiKeyInput.value = config.apiKey || '';
            wixApiSecretInput.value = config.apiSecret || '';
        }
    } catch (error) {
        console.error('Error loading Wix config:', error);
    }
}

/**
 * Save Wix configuration
 * @param {Event} event - Form submit event
 */
function saveWixConfig(event) {
    if (event) event.preventDefault();
    if (!wixIntegration) return;
    
    try {
        const config = {
            siteId: wixSiteIdInput.value,
            apiKey: wixApiKeyInput.value,
            apiSecret: wixApiSecretInput.value
        };
        
        wixIntegration.saveWixConfig(config);
        wixIntegration.initWixConfig(config);
        
        // Show success message
        window.app.showAlert('Success', 'Wix configuration saved successfully.');
    } catch (error) {
        console.error('Error saving Wix config:', error);
        window.app.showAlert('Error', 'Failed to save Wix configuration: ' + error.message);
    }
}

/**
 * Test Wix API connection
 */
async function testWixConnection() {
    if (!wixIntegration && !ipcRenderer) {
        wixConnectionStatus.textContent = 'Error: Wix integration not available';
        wixConnectionStatus.className = 'text-danger';
        return;
    }
    
    try {
        // Update UI to show testing
        wixConnectionStatus.textContent = 'Testing connection...';
        wixConnectionStatus.className = 'text-muted';
        testWixConnectionBtn.disabled = true;
        
        // Get current values from inputs
        const credentials = {
            siteId: wixSiteIdInput.value.trim(),
            apiKey: wixApiKeyInput.value.trim(),
            apiSecret: wixApiSecretInput.value.trim()
        };
        
        // Validate inputs
        if (!credentials.siteId || !credentials.apiKey || !credentials.apiSecret) {
            throw new Error('Please fill in all Wix credential fields');
        }
        
        let isConnected = false;
        
        // Use IPC if available (preferred in production)
        if (ipcRenderer) {
            // Initialize config through IPC
            const initResult = await ipcRenderer.invoke('wix:initConfig', credentials);
            if (!initResult.success) {
                throw new Error(initResult.error || 'Failed to initialize Wix configuration');
            }
            
            // Test connection through IPC
            const testResult = await ipcRenderer.invoke('wix:testConnection');
            isConnected = testResult.success && testResult.connected;
        } else {
            // Direct module call (fallback for development)
            wixIntegration.initWixConfig(credentials);
            isConnected = await wixIntegration.testWixConnection();
        }
        
        // Update UI based on result
        if (isConnected) {
            wixConnectionStatus.textContent = 'Connected successfully!';
            wixConnectionStatus.className = 'text-success';
            
            // Save credentials to config file (this will be handled by the main process)
            if (ipcRenderer) {
                await ipcRenderer.invoke('saveConfig', { wix: credentials });
            }
            
            // Show success message
            window.app.showAlert('Success', 'Wix connection established successfully! Your credentials have been saved.');
        } else {
            wixConnectionStatus.textContent = 'Connection failed. Check credentials.';
            wixConnectionStatus.className = 'text-danger';
        }
    } catch (error) {
        console.error('Error testing Wix connection:', error);
        wixConnectionStatus.textContent = 'Error: ' + error.message;
        wixConnectionStatus.className = 'text-danger';
        window.app.showAlert('Error', 'Failed to connect to Wix: ' + error.message);
    } finally {
        testWixConnectionBtn.disabled = false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeWixSettings);

// Make functions available globally
window.wixSettingsModule = {
    initializeWixSettings,
    loadWixConfig,
    saveWixConfig,
    testWixConnection
};
