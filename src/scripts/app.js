/**
 * Front Desk Ops Application - Main Script
 * Handles core application functionality and navigation
 */

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const contentPages = document.querySelectorAll('.content-page');
let alertModal;
let alertModalTitle;
let alertModalBody;
let alertModalConfirm;

// Initialize Bootstrap components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap components
  alertModal = new bootstrap.Modal(document.getElementById('alert-modal'));
  alertModalTitle = document.getElementById('alert-modal-title');
  alertModalBody = document.getElementById('alert-modal-body');
  alertModalConfirm = document.getElementById('alert-modal-confirm');
  
  // Set up navigation
  setupNavigation();
  
  // Initialize dashboard
  initializeDashboard();
});

// Application State
const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('AppScript');
const appState = {
  currentPage: 'dashboard',
  settings: {
    wixApiKey: '',
    owncastUrl: '',
    scanIdPath: '',
    timeClockDb: ''
  },
  currentUser: {
    name: 'Staff Member',
    role: 'Front Desk',
    photo: '../assets/placeholder-profile.svg'
  }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Load application settings
  loadSettings();
  
  // Initialize connection status bar
  if (typeof initializeConnectionStatus === 'function') {
    initializeConnectionStatus();
  } else {
    logger.warn('Connection status initialization function not found');
  }
  
  // Direct event listener for Check-In tab
  const checkInLink = document.getElementById('checkin-nav-link');
  if (checkInLink) {
    console.log('Found Check-In link, adding direct event listener');
    checkInLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Check-In tab clicked directly');
      
      // Hide all content pages
      document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
      });
      
      // Show Check-In page
      const checkInPage = document.getElementById('checkin');
      if (checkInPage) {
        console.log('Found Check-In page, activating');
        checkInPage.classList.add('active');
        
        // Initialize check-in if available
        if (typeof window.initCheckIn === 'function') {
          window.initCheckIn();
        }
      } else {
        console.error('Check-In page not found');
      }
      
      // Update nav links
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
      });
      checkInLink.classList.add('active');
    });
  } else {
    console.error('Check-In link not found');
  }
  
  // Set up navigation
  setupNavigation();
  
  // Initialize dashboard
  initializeDashboard();
  
  // Set up event listeners
  setupEventListeners();
});

/**
 * Load application settings from local storage
 */
function loadSettings() {
  const savedSettings = localStorage.getItem('frontDeskOpsSettings');
  if (savedSettings) {
    try {
      appState.settings = JSON.parse(savedSettings);
      logger.info('Settings loaded', { settings: appState.settings });
      
      // Apply settings to form fields
      if (document.getElementById('wix-api-key')) {
        document.getElementById('wix-api-key').value = appState.settings.wixApiKey || '';
      }
      if (document.getElementById('owncast-url')) {
        document.getElementById('owncast-url').value = appState.settings.owncastUrl || '';
      }
      if (document.getElementById('scan-id-path')) {
        document.getElementById('scan-id-path').value = appState.settings.scanIdPath || '';
      }
      if (document.getElementById('time-clock-db')) {
        document.getElementById('time-clock-db').value = appState.settings.timeClockDb || '';
      }
    } catch (error) {
      logger.error('Error loading settings', { error });
      showAlert('Error', 'Failed to load application settings. Default settings will be used.');
    }
  }
}

/**
 * Save application settings to local storage
 */
function saveSettings() {
  appState.settings.wixApiKey = document.getElementById('wix-api-key').value;
  appState.settings.owncastUrl = document.getElementById('owncast-url').value;
  appState.settings.scanIdPath = document.getElementById('scan-id-path').value;
  appState.settings.timeClockDb = document.getElementById('time-clock-db').value;
  
  localStorage.setItem('frontDeskOpsSettings', JSON.stringify(appState.settings));
  logger.info('Settings saved', { settings: appState.settings });
  
  console.log('Settings saved successfully!');
  showAlert('Success', 'Settings saved successfully!');
}

/**
 * Set up navigation event listeners
 */
function setupNavigation() {
  console.log('Setting up navigation, found links:', navLinks.length);
  
  // Add click event listeners to navigation links
  navLinks.forEach(link => {
    const pageName = link.getAttribute('data-page');
    console.log(`Setting up listener for ${pageName}`);
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = link.getAttribute('data-page');
      console.log(`Navigation link clicked: ${pageName}`);
      navigateToPage(pageName);
    });
  });
}

/**
 * Navigate to a specific page
 * @param {string} pageName - The name of the page to navigate to
 */
function navigateToPage(pageName) {
  console.log(`Navigating to page: ${pageName}`);
  
  // Update current page in app state
  appState.currentPage = pageName;
  
  // Update active nav link
  console.log(`Updating nav links for ${pageName}, total links: ${navLinks.length}`);
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('data-page');
    console.log(`Checking nav link: ${linkPage}`);
    if (linkPage === pageName) {
      console.log(`Setting ${linkPage} as active`);
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Use the ID that matches the page name
  const pageId = pageName;
  console.log(`Looking for content page with ID: ${pageId}`);
  
  // Show selected page, hide others
  console.log(`Total content pages found: ${contentPages.length}`);
  let pageFound = false;
  contentPages.forEach(page => {
    console.log(`Checking page: ${page.id}`);
    if (page.id === pageId) {
      console.log(`Activating page: ${pageId}`);
      page.classList.add('active');
      pageFound = true;
      logger.info(`Activating page: ${pageId}`);
    } else {
      page.classList.remove('active');
    }
  });
  
  if (!pageFound) {
    console.error(`Page not found: ${pageId}`);
  }
  
  // Perform any page-specific initialization
  switch (pageName) {
    case 'dashboard':
      refreshDashboard();
      break;
    case 'cin':
      resetCheckInForm();
      break;
    case 'fuck':
      // The fuck.js script handles initialization
      console.log('FUCK tab selected');
      break;
    case 'staff':
      loadStaffData();
      break;
    case 'knowledge-base':
      // Knowledge base is handled by its own module
      break;
    case 'incidents':
      // Incidents are handled by their own module
      break;
    case 'announcements':
      // Announcements are handled by their own module
      break;
    case 'settings':
      // Settings are loaded on app init
      break;
  }
}

/**
 * Initialize the dashboard with data
 */
function initializeDashboard() {
  // Load dashboard data
  refreshDashboard();
}

/**
 * Refresh dashboard data
 */
function refreshDashboard() {
  // Example: Recent check-ins (TODO: wire to DB)
  const recentCheckinsContainer = document.getElementById('recent-checkins');
  if (recentCheckinsContainer) {
    recentCheckinsContainer.innerHTML = `<tr><td>John Doe</td><td>10:15 AM</td><td>Monthly</td></tr>`; // Placeholder
  }
  
  // Announcements
  const announcementsList = document.getElementById('announcements-list');
  if (announcementsList) {
    announcementsList.innerHTML = `
      <div class="announcement">
        <h6>System Update</h6>
        <p>Front Desk Ops will be updated tonight at 11 PM. Please save your work.</p>
        <small>Posted: Today, 9:15 AM</small>
      </div>
    `;
  }
}

/**
 * Reset Check-In form and initialize it
 */
function resetCheckInForm() {
  logger.info('Initializing Check-In tab');
  
  // Reset form fields
  const idFields = ['id-first-name', 'id-last-name', 'id-dob'];
  const accountFields = ['account-first-name', 'account-last-name', 'account-birthday', 'account-email', 'account-phone', 'membership-status'];
  
  // Reset ID scan fields
  idFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) field.value = '';
  });
  
  // Reset account fields
  accountFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) field.value = '';
  });
  
  // Reset images
  const idPhoto = document.getElementById('id-photo');
  const profilePhoto = document.getElementById('profile-photo');
  
  if (idPhoto) idPhoto.src = 'assets/placeholder-profile.svg';
  if (profilePhoto) profilePhoto.src = 'assets/placeholder-profile.svg';
  
  // Initialize check-in event listeners if not already done
  if (typeof window.initCheckIn === 'function') {
    window.initCheckIn();
  }
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
  // Settings form submission
  const appSettingsForm = document.getElementById('app-settings-form');
  if (appSettingsForm) {
    appSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettings();
    });
  }
  
  // Database management buttons
  const backupDbBtn = document.getElementById('backup-db-btn');
  if (backupDbBtn) {
    backupDbBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Backup Database',
        'Are you sure you want to create a backup of the database?',
        () => {
          // Backup database logic would go here
          showAlert('Success', 'Database backup created successfully!');
          document.getElementById('db-last-backup').textContent = new Date().toLocaleString();
        }
      );
    });
  }
  
  const restoreDbBtn = document.getElementById('restore-db-btn');
  if (restoreDbBtn) {
    restoreDbBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Restore Database',
        'Are you sure you want to restore the database from backup? This will overwrite current data.',
        () => {
          // Restore database logic would go here
          showAlert('Success', 'Database restored successfully!');
        }
      );
    });
  }
  
  const resetDbBtn = document.getElementById('reset-db-btn');
  if (resetDbBtn) {
    resetDbBtn.addEventListener('click', () => {
      showConfirmDialog(
        'Reset Database',
        'WARNING: This will delete all data in the database. This action cannot be undone. Are you sure you want to proceed?',
        () => {
          // Reset database logic would go here
          showAlert('Success', 'Database has been reset.');
        }
      );
    });
  }
}

/**
 * Show an alert modal with a message
 * @param {string} title - The title of the alert
 * @param {string} message - The message to display
 */
function showAlert(title, message) {
  alertModalTitle.textContent = title;
  alertModalBody.textContent = message;
  alertModalConfirm.style.display = 'none';
  alertModal.show();
}

/**
 * Show a confirmation dialog with a callback for confirmation
 * @param {string} title - The title of the dialog
 * @param {string} message - The message to display
 * @param {Function} onConfirm - The callback function to execute on confirmation
 */
function showConfirmDialog(title, message, onConfirm) {
  alertModalTitle.textContent = title;
  alertModalBody.textContent = message;
  alertModalConfirm.style.display = 'block';
  
  // Remove any existing event listeners
  const newConfirmBtn = alertModalConfirm.cloneNode(true);
  alertModalConfirm.parentNode.replaceChild(newConfirmBtn, alertModalConfirm);
  
  // Add new event listener
  newConfirmBtn.addEventListener('click', () => {
    alertModal.hide();
    onConfirm();
  });
  
  alertModal.show();
}

/**
 * Ensure dark theme is always used
 */
document.addEventListener('DOMContentLoaded', () => {
  // Force dark theme
  document.documentElement.classList.remove('light-theme');
  localStorage.setItem('theme', 'dark');
});

// Export functions for use in other modules
window.app = window.app || {};

// Extend the app object with our functions
Object.assign(window.app, {
  navigateToPage,
  showAlert,
  showConfirmDialog,
  appState
});
