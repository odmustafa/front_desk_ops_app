/**
 * Member Check-In Module
 * Handles member check-in functionality using Wix integration
 */

// Get Wix integration module
const wixIntegration = window.require ? window.require('../database/wix-integration.js') : null;
const { ipcRenderer } = window.require ? window.require('electron') : {};

// Get logger
let logger;
try {
    logger = window.require ? window.require('../utils/logger.js') : console;
} catch (error) {
    // Fallback to console if logger is not available
    logger = {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error
    };
}

// DOM Elements
let memberSearchInput;
let memberSearchBtn;
let memberSearchResults;
let searchLocalOnly;
let memberCheckInForm;
let memberInfoDisplay;
let checkInHistoryList;

// Store the last search results
let lastSearchResults = [];

/**
 * Initialize member check-in module
 */
function initializeMemberCheckIn() {
    // Get DOM elements
    memberSearchInput = document.getElementById('member-search');
    memberSearchBtn = document.getElementById('member-search-btn');
    memberSearchResults = document.getElementById('member-search-results');
    searchLocalOnly = document.getElementById('search-local-only');
    memberCheckInForm = document.getElementById('member-check-in-form');
    memberInfoDisplay = document.getElementById('member-info');
    checkInHistoryList = document.getElementById('check-in-history');
    
    // Set up event listeners
    if (memberSearchBtn) {
        memberSearchBtn.addEventListener('click', searchMembers);
    }
    
    if (memberSearchInput) {
        memberSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchMembers();
            }
        });
        
        // Add input event for real-time search suggestions
        memberSearchInput.addEventListener('input', debounce(() => {
            const searchTerm = memberSearchInput.value.trim();
            if (searchTerm.length >= 3) {
                searchMembers(true); // true for quick search (fewer results)
            }
        }, 500)); // 500ms debounce
    }
    
    if (memberCheckInForm) {
        memberCheckInForm.addEventListener('submit', checkInMember);
    }
    
    // Load check-in history
    loadCheckInHistory();
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Search for members using Wix API
 * @param {boolean} quickSearch - If true, only return a few results for suggestions
 */
async function searchMembers(quickSearch = false) {
    if (!ipcRenderer && !wixIntegration) {
        showError('Wix integration not available');
        return;
    }
    
    const searchTerm = memberSearchInput.value.trim();
    if (!searchTerm) {
        if (!quickSearch) {
            showError('Please enter a search term');
        }
        return;
    }
    
    // For quick search (suggestions), minimum 3 characters
    if (quickSearch && searchTerm.length < 3) {
        return;
    }
    
    // Log search attempt
    logger.info(`Member search initiated`, { 
        searchTerm, 
        quickSearch, 
        localOnly: searchLocalOnly?.checked 
    });
    
    try {
        // Show loading state (only for full searches, not quick searches)
        if (!quickSearch) {
            memberSearchResults.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Searching...</p></div>';
        } else {
            // For quick search, just show a small loading indicator
            const existingContent = memberSearchResults.innerHTML;
            if (!existingContent.includes('spinner-border')) {
                memberSearchResults.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
            }
        }
        
        // Check if we should only search local cache
        const localOnly = searchLocalOnly && searchLocalOnly.checked;
        
        // First try to search in local database cache
        let members = [];
        if (ipcRenderer) {
            logger.debug(`Searching local cache for: ${searchTerm}`);
            members = await ipcRenderer.invoke('db:getCachedMembers', searchTerm);
            logger.debug(`Local cache search results:`, { count: members.length });
        }
        
        // If no results in cache and local-only is not checked, try Wix API
        if (members.length === 0 && !localOnly) {
            // Search for members using Wix API
            if (ipcRenderer) {
                logger.debug(`Searching Wix API for: ${searchTerm}`);
                const result = await ipcRenderer.invoke('wix:searchMembers', searchTerm);
                if (result.success) {
                    members = result.members;
                    logger.debug(`Wix API search results:`, { count: members.length });
                    
                    // Cache these members for future searches
                    if (members.length > 0) {
                        logger.debug(`Caching ${members.length} members from Wix API`);
                        members.forEach(member => cacheMember(member));
                    }
                } else {
                    logger.error(`Wix API search failed:`, { error: result.error });
                    throw new Error(result.error || 'Failed to search members');
                }
            } else {
                // For development without Electron
                logger.debug(`Searching Wix API directly for: ${searchTerm}`);
                members = await wixIntegration.searchWixMembers(searchTerm);
                logger.debug(`Direct Wix API search results:`, { count: members.length });
            }
        }
        
        // Store the search results for later use
        lastSearchResults = members;
        
        // Log search results
        logger.info(`Member search completed`, { 
            searchTerm, 
            totalResults: members.length,
            source: localOnly ? 'local database' : 'Wix and local database'
        });
        
        // Output detailed results to console for debugging
        if (members.length > 0) {
            console.group(`Member Search Results for "${searchTerm}"`);
            members.forEach((member, index) => {
                const firstName = member.contactInfo?.firstName || member.first_name || '';
                const lastName = member.contactInfo?.lastName || member.last_name || '';
                const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Unknown Name';
                const email = member.loginEmail || member.email || 'No email';
                const memberId = member._id || member.wix_id;
                
                console.log(`${index + 1}. ${name} (${memberId}) - ${email}`);
            });
            console.groupEnd();
        }
        
        // Display results
        if (members.length === 0) {
            memberSearchResults.innerHTML = '<div class="alert alert-info">No members found</div>';
            return;
        }
        
        // Limit results for quick search
        if (quickSearch && members.length > 5) {
            members = members.slice(0, 5);
        }
        
        // Build results HTML
        let html = '<div class="list-group">';
        members.forEach(member => {
            // Handle different property naming between Wix API and our cache
            const firstName = member.contactInfo?.firstName || member.first_name || '';
            const lastName = member.contactInfo?.lastName || member.last_name || '';
            const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Unknown Name';
            
            const email = member.loginEmail || member.email || 'No email';
            const memberId = member._id || member.wix_id;
            const status = member.membershipStatus || member.membership_status || 'UNKNOWN';
            const phone = member.contactInfo?.phone || member.phone || 'No phone';
            
            // Determine membership status class
            let statusClass = 'bg-secondary';
            if (status === 'ACTIVE') statusClass = 'bg-success';
            if (status === 'EXPIRED') statusClass = 'bg-danger';
            
            html += `
                <a href="#" class="list-group-item list-group-item-action" data-member-id="${memberId}" onclick="memberCheckInModule.selectMember('${memberId}')">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${name}</h5>
                        <span class="badge ${statusClass}">${status}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <p class="mb-1">${email}</p>
                        <small>${phone}</small>
                    </div>
                </a>
            `;
        });
        
        // Add a "Show more results" button if this was a quick search and there are more results
        if (quickSearch && lastSearchResults.length > 5) {
            html += `
                <button class="btn btn-outline-primary btn-sm mt-2 w-100" onclick="memberCheckInModule.searchMembers()">
                    Show all ${lastSearchResults.length} results
                </button>
            `;
        }
        
        html += '</div>';
        
        // Add a source indicator
        const source = localOnly ? 'local database' : 'Wix and local database';
        html += `<div class="text-muted small mt-2">Results from: ${source}</div>`;
        
        memberSearchResults.innerHTML = html;
        
        // Add click event to member results
        document.querySelectorAll('.member-result').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const memberId = item.getAttribute('data-id');
                selectMember(memberId, members);
            });
        });
        
    } catch (error) {
        console.error('Error searching members:', error);
        memberSearchResults.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

/**
 * Cache member data in local database
 * @param {Object} member - Member data from Wix
 */
async function cacheMember(member) {
    try {
        if (!ipcRenderer) return;
        
        const cachedMember = {
            wix_id: member._id,
            first_name: member.contactInfo?.firstName || '',
            last_name: member.contactInfo?.lastName || '',
            email: member.loginEmail || '',
            phone: member.contactInfo?.phone || '',
            membership_status: member.membershipStatus || '',
            membership_expiry: member.membershipExpiryDate || ''
        };
        
        await ipcRenderer.invoke('db:cacheMember', cachedMember);
    } catch (error) {
        console.error('Error caching member data:', error);
    }
}

/**
 * Select a member from search results
 * @param {string} memberId - Member ID
 */
async function selectMember(memberId) {
    try {
        // Find the member in the last search results first
        let member = lastSearchResults.find(m => m._id === memberId || m.wix_id === memberId);
        
        // If not found in last search results, try to get from database or Wix
        if (!member && ipcRenderer) {
            // Try to get member from database or Wix
            const result = await ipcRenderer.invoke('wix:getMember', memberId);
            if (result.success) {
                member = result.member;
            } else {
                throw new Error(result.error || 'Failed to get member details');
            }
        }
        
        if (!member) {
            throw new Error('Member not found');
        }
        
        // Display member information
        displayMemberInfo(member);
        
        // Clear search results
        memberSearchResults.innerHTML = '';
        
        // Highlight the selected member in the search results
        const memberElements = document.querySelectorAll(`[data-member-id="${memberId}"]`);
        memberElements.forEach(el => {
            el.classList.add('active');
        });
    } catch (error) {
        console.error('Error selecting member:', error);
        showError('Failed to select member: ' + error.message);
    }
}

/**
 * Display member information
 * @param {Object} member - Member object
 */
function displayMemberInfo(member) {
    if (!memberInfoDisplay) return;
    
    const name = member.contactInfo?.firstName && member.contactInfo?.lastName 
        ? `${member.contactInfo.firstName} ${member.contactInfo.lastName}`
        : 'Unknown Name';
    
    const email = member.loginEmail || 'No email';
    const phone = member.contactInfo?.phone || 'No phone';
    const status = member.membershipStatus || 'UNKNOWN';
    
    // Format membership dates
    const createdDate = member.created ? new Date(member.created).toLocaleDateString() : 'Unknown';
    const expiryDate = member.membershipExpiryDate ? new Date(member.membershipExpiryDate).toLocaleDateString() : 'N/A';
    
    // Determine status class
    let statusClass = 'text-secondary';
    if (status === 'ACTIVE') statusClass = 'text-success';
    if (status === 'EXPIRED') statusClass = 'text-danger';
    if (status === 'PENDING') statusClass = 'text-warning';
    
    // Build member info HTML
    const html = `
        <div class="card">
            <div class="card-header">
                <h5>${name}</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Member Since:</strong> ${createdDate}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Status:</strong> <span class="${statusClass}">${status}</span></p>
                        <p><strong>Expiry Date:</strong> ${expiryDate}</p>
                        <p><strong>Member ID:</strong> ${member._id}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    memberInfoDisplay.innerHTML = html;
    memberInfoDisplay.classList.remove('d-none');
}

/**
 * Check in a member
 * @param {Event} event - Form submit event
 */
async function checkInMember(event) {
    if (event) event.preventDefault();
    
    const memberId = document.getElementById('member-id').value;
    const purpose = document.getElementById('check-in-purpose').value;
    const notes = document.getElementById('check-in-notes').value;
    
    if (!memberId) {
        showError('No member selected');
        return;
    }
    
    try {
        // Create check-in record
        const checkIn = {
            memberId,
            purpose,
            notes,
            timestamp: new Date().toISOString()
        };
        
        // Save check-in to database
        if (ipcRenderer) {
            await ipcRenderer.invoke('db:addCheckIn', checkIn);
        } else {
            console.log('Check-in would be saved:', checkIn);
        }
        
        // Show success message
        window.app.showAlert('Success', 'Member checked in successfully');
        
        // Reset form
        memberCheckInForm.reset();
        memberInfoDisplay.classList.add('d-none');
        memberSearchResults.innerHTML = '';
        
        // Reload check-in history
        loadCheckInHistory();
        
    } catch (error) {
        console.error('Error checking in member:', error);
        showError('Failed to check in member: ' + error.message);
    }
}

/**
 * Load check-in history
 */
async function loadCheckInHistory() {
    if (!checkInHistoryList) return;
    
    try {
        let checkIns = [];
        
        if (ipcRenderer) {
            checkIns = await ipcRenderer.invoke('db:getRecentCheckIns', 10);
        } else {
            // Mock data for development
            checkIns = [
                {
                    id: 1,
                    memberId: '123456',
                    memberName: 'John Doe',
                    purpose: 'Class',
                    timestamp: new Date().toISOString()
                }
            ];
        }
        
        if (checkIns.length === 0) {
            checkInHistoryList.innerHTML = '<div class="text-center text-muted">No recent check-ins</div>';
            return;
        }
        
        // Build history HTML
        let html = '';
        checkIns.forEach(checkIn => {
            const date = new Date(checkIn.timestamp).toLocaleDateString();
            const time = new Date(checkIn.timestamp).toLocaleTimeString();
            
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">${checkIn.memberName || 'Unknown Member'}</h6>
                        <small>${date} ${time}</small>
                    </div>
                    <p class="mb-1">Purpose: ${checkIn.purpose}</p>
                    ${checkIn.notes ? `<small class="text-muted">Notes: ${checkIn.notes}</small>` : ''}
                </div>
            `;
        });
        
        checkInHistoryList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading check-in history:', error);
        checkInHistoryList.innerHTML = '<div class="alert alert-danger">Error loading check-in history</div>';
    }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    if (window.app && window.app.showAlert) {
        window.app.showAlert('Error', message);
    } else {
        alert(message);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeMemberCheckIn);

// Make functions available globally
window.memberCheckInModule = {
    initializeMemberCheckIn,
    searchMembers,
    checkInMember,
    loadCheckInHistory
};
