/**
 * Wix Integration Module for Tribute Music Gallery Front Desk App
 * Handles all Wix API interactions for members, content, and bookings
 * Uses direct REST API calls instead of Wix SDK packages
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron.app || electron.remote.app;

// Config file path
const configPath = path.join(app.getPath('userData'), 'wix-config.json');

// Wix API configuration
let wixConfig = null;

/**
 * Initialize Wix API configuration with credentials
 * @param {Object} credentials - Wix API credentials
 * @returns {Object} - Initialized Wix configuration
 */
function initWixConfig(credentials) {
    try {
        // Save credentials to config file
        saveWixConfig(credentials);
        
        // Store configuration in memory
        wixConfig = credentials;
        
        return wixConfig;
    } catch (error) {
        console.error('Error initializing Wix config:', error);
        throw error;
    }
}

/**
 * Save Wix configuration to file
 * @param {Object} config - Wix configuration
 */
function saveWixConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving Wix config:', error);
    }
}

/**
 * Load Wix configuration from file
 * @returns {Object|null} - Wix configuration or null if not found
 */
function loadWixConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config;
        }
    } catch (error) {
        console.error('Error loading Wix config:', error);
    }
    return null;
}

/**
 * Get or initialize Wix configuration
 * @param {Object} credentials - Optional credentials to reinitialize
 * @returns {Object} - Wix configuration
 */
function getWixConfig(credentials) {
    if (credentials) {
        wixConfig = initWixConfig(credentials);
        return wixConfig;
    }
    
    if (!wixConfig) {
        const config = loadWixConfig();
        if (config) {
            wixConfig = config;
        }
    }
    
    return wixConfig;
}

/**
 * Test Wix connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
async function testWixConnection() {
    try {
        const config = getWixConfig();
        if (!config) return false;
        
        // Try to make a simple API call to test connection
        // This is a public endpoint that doesn't require authentication
        const response = await axios.get(`https://www.wixapis.com/site-properties/v4/properties?siteId=${config.siteId}`, {
            headers: {
                'Authorization': config.apiKey
            }
        });
        
        return response.status === 200;
    } catch (error) {
        console.error('Wix connection test failed:', error);
        return false;
    }
}

/**
 * Get all members from Wix
 * @param {Object} filters - Optional filters for members query
 * @returns {Promise<Array>} - Array of members
 */
async function getWixMembers(filters = {}) {
    try {
        const config = getWixConfig();
        if (!config) throw new Error('Wix configuration not initialized');
        
        // If filtering by memberId, use the direct endpoint
        if (filters.memberId) {
            try {
                const response = await axios.get(`https://www.wixapis.com/members/v1/members/${filters.memberId}`, {
                    headers: {
                        'Authorization': config.apiKey,
                        'wix-site-id': config.siteId
                    }
                });
                
                if (response.data && response.data.member) {
                    return [response.data.member];
                }
                return [];
            } catch (memberError) {
                console.error(`Error fetching member ${filters.memberId}:`, memberError);
                return [];
            }
        }
        
        // Otherwise, build query parameters for list endpoint
        const queryParams = new URLSearchParams();
        if (filters.email) queryParams.append('email', filters.email);
        if (filters.status) queryParams.append('membershipStatus', filters.status);
        if (filters.limit) queryParams.append('limit', filters.limit);
        
        // Make API request to Wix Members API
        const response = await axios.get(`https://www.wixapis.com/members/v1/members?${queryParams.toString()}`, {
            headers: {
                'Authorization': config.apiKey,
                'wix-site-id': config.siteId
            }
        });
        
        if (response.data && response.data.members) {
            return response.data.members;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching Wix members:', error);
        return [];
    }
}

/**
 * Search for a member by ID, email, or name
 * @param {string} searchTerm - Search term (ID, email, or name)
 * @returns {Promise<Array>} - Array of matching members
 */
async function searchWixMembers(searchTerm) {
    try {
        const config = getWixConfig();
        if (!config) throw new Error('Wix configuration not initialized');
        
        // First try to search by member ID
        try {
            const response = await axios.get(`https://www.wixapis.com/members/v1/members/${searchTerm}`, {
                headers: {
                    'Authorization': config.apiKey,
                    'wix-site-id': config.siteId
                }
            });
            
            if (response.data && response.data.member) {
                return [response.data.member];
            }
        } catch (error) {
            // ID not found, continue with search
            console.log('Member ID not found, trying other search methods');
        }
        
        // Search by email or name
        const queryParams = new URLSearchParams();
        queryParams.append('search', searchTerm);
        
        const response = await axios.get(`https://www.wixapis.com/members/v1/members/search?${queryParams.toString()}`, {
            headers: {
                'Authorization': config.apiKey,
                'wix-site-id': config.siteId
            }
        });
        
        if (response.data && response.data.members) {
            return response.data.members;
        }
        
        return [];
    } catch (error) {
        console.error('Error searching Wix members:', error);
        return [];
    }
}

/**
 * Get upcoming events from Wix
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Array>} - Array of events
 */
async function getWixEvents(limit = 10) {
    try {
        const config = getWixConfig();
        if (!config) throw new Error('Wix configuration not initialized');
        
        const now = new Date().toISOString();
        const queryParams = new URLSearchParams();
        queryParams.append('limit', limit);
        queryParams.append('futureOnly', 'true');
        
        const response = await axios.get(`https://www.wixapis.com/events/v1/events?${queryParams.toString()}`, {
            headers: {
                'Authorization': config.apiKey,
                'wix-site-id': config.siteId
            }
        });
        
        if (response.data && response.data.events) {
            return response.data.events;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching Wix events:', error);
        return [];
    }
}

/**
 * Get member's payment history
 * @param {string} memberId - Member ID
 * @returns {Promise<Array>} - Array of payment transactions
 */
async function getMemberPayments(memberId) {
    try {
        const config = getWixConfig();
        if (!config) throw new Error('Wix configuration not initialized');
        
        const queryParams = new URLSearchParams();
        queryParams.append('memberId', memberId);
        
        const response = await axios.get(`https://www.wixapis.com/payments/v1/transactions?${queryParams.toString()}`, {
            headers: {
                'Authorization': config.apiKey,
                'wix-site-id': config.siteId
            }
        });
        
        if (response.data && response.data.transactions) {
            return response.data.transactions;
        }
        
        return [];
    } catch (error) {
        console.error(`Error fetching payment history for member ${memberId}:`, error);
        return [];
    }
}

/**
 * Check member in for an event
 * @param {string} memberId - Member ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} - Check-in result
 */
async function checkInMemberForEvent(memberId, eventId) {
    try {
        const config = getWixConfig();
        if (!config) throw new Error('Wix configuration not initialized');
        
        // Make API request to check in a member for an event
        const response = await axios.post(`https://www.wixapis.com/events/v1/events/${eventId}/registrations/${memberId}/checkin`, {}, {
            headers: {
                'Authorization': config.apiKey,
                'wix-site-id': config.siteId,
                'Content-Type': 'application/json'
            }
        });
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`Error checking in member ${memberId} for event ${eventId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Update member information
 * @param {string} memberId - Member ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated member
 */
async function updateWixMember(memberId, updates) {
    try {
        const config = getWixConfig();
        if (!config) throw new Error('Wix configuration not initialized');
        
        const response = await axios.patch(`https://www.wixapis.com/members/v1/members/${memberId}`, updates, {
            headers: {
                'Authorization': config.apiKey,
                'wix-site-id': config.siteId,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.member) {
            return { success: true, member: response.data.member };
        }
        
        return { success: false, error: 'Failed to update member' };
    } catch (error) {
        console.error(`Error updating member ${memberId}:`, error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initWixConfig,
    getWixConfig,
    testWixConnection,
    getWixMembers,
    searchWixMembers,
    getWixEvents,
    getMemberPayments,
    checkInMemberForEvent,
    updateWixMember,
    saveWixConfig,
    loadWixConfig
};
