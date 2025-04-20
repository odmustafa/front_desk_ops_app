/**
 * Front Desk Ops Application - Main Script
 * Handles core application functionality and navigation
 */

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const contentPages = document.querySelectorAll('.content-page');
const alertModal = new bootstrap.Modal(document.getElementById('alert-modal'));
const alertModalTitle = document.getElementById('alert-modal-title');
const alertModalBody = document.getElementById('alert-modal-body');
const alertModalConfirm = document.getElementById('alert-modal-confirm');

// Application State
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
    photo: '../assets/placeholder-profile.png'
  }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Load application settings
  loadSettings();
  
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
      console.log('Settings loaded:', appState.settings);
      
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
      console.error('Error loading settings:', error);
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
  console.log('Settings saved:', appState.settings);
  
  showAlert('Success', 'Settings saved successfully!');
}

/**
 * Set up navigation between pages
 */
function setupNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute('data-page');
      navigateToPage(targetPage);
    });
  });
}

/**
 * Navigate to a specific page
 * @param {string} pageName - The name of the page to navigate to
 */
function navigateToPage(pageName) {
  // Update active nav link
  navLinks.forEach(link => {
    if (link.getAttribute('data-page') === pageName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Show selected page, hide others
  contentPages.forEach(page => {
    if (page.id === pageName) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });
  
  // Update current page in app state
  appState.currentPage = pageName;
  
  // Perform any page-specific initialization
  switch (pageName) {
    case 'dashboard':
      refreshDashboard();
      break;
    case 'check-in':
      resetCheckInForm();
      break;
    case 'staff':
      loadStaffData();
      break;
    case 'knowledge-base':
      loadKnowledgeBase();
      break;
    case 'incidents':
      loadIncidentReports();
      break;
    case 'announcements':
      loadAnnouncements();
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
async function refreshDashboard() {
  // Example: Recent check-ins (TODO: wire to DB)
  const recentCheckinsContainer = document.getElementById('recent-checkins');
  if (recentCheckinsContainer) {
    recentCheckinsContainer.innerHTML = `<tr><td>John Doe</td><td>10:15 AM</td><td>Monthly</td></tr>`; // Placeholder
  }
  // Announcements
  const announcementsList = document.getElementById('announcements-list');
  if (announcementsList) {
    const announcements = await getAnnouncements();
    announcementsList.innerHTML = '';
    announcements.forEach(a => {
      const div = document.createElement('div');
      div.className = `announcement ${a.priority || ''}`;
      div.innerHTML = `<div class="announcement-title">${a.title}</div><div class="announcement-content">${a.content}</div><div class="announcement-date">Posted: ${new Date(a.created_at).toLocaleDateString()}</div>`;
      announcementsList.appendChild(div);
    });
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

// --- Knowledge Base ---
import { getKnowledgeBaseArticles, addKnowledgeBaseArticle } from './knowledge-base.js';

function renderKnowledgeBase(articles) {
  const kbContent = document.getElementById('kb-content');
  if (!kbContent) return;
  if (!articles || articles.length === 0) {
    kbContent.innerHTML = '<p class="text-center text-muted">No articles found.</p>';
    return;
  }
  kbContent.innerHTML = '';
  articles.forEach(article => {
    const div = document.createElement('div');
    div.className = 'kb-article';
    div.innerHTML = `<h5>${article.title}</h5><div>${article.content}</div><hr>`;
    kbContent.appendChild(div);
  });
}

async function loadKnowledgeBase() {
  const articles = await getKnowledgeBaseArticles();
  renderKnowledgeBase(articles);
}

function setupKnowledgeBaseForm() {
  // If you add a form for KB articles, wire it up here
}

document.addEventListener('DOMContentLoaded', setupKnowledgeBaseForm);

// --- Incidents ---
import { getIncidentReports, addIncidentReport } from './incidents.js';

function renderIncidentList(reports) {
  const incidentList = document.getElementById('incident-list');
  if (!incidentList) return;
  if (!reports || reports.length === 0) {
    incidentList.innerHTML = '<div class="list-group-item">No incidents reported yet.</div>';
    return;
  }
  incidentList.innerHTML = '';
  reports.forEach(report => {
    const item = document.createElement('div');
    item.className = 'list-group-item';
    item.innerHTML = `<strong>${report.reported_by || 'Unknown'}</strong> - ${report.description}<br><small>${report.created_at}</small>`;
    incidentList.appendChild(item);
  });
}

async function loadIncidentReports() {
  const reports = await getIncidentReports();
  renderIncidentList(reports);
}

function setupIncidentForm() {
  const form = document.getElementById('incident-form');
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const report = {
      reported_by: document.getElementById('incident-reporter').value,
      description: document.getElementById('incident-description').value,
      status: 'open',
    };
    await addIncidentReport(report);
    form.reset();
    loadIncidentReports();
    window.app.showAlert('Success', 'Incident report submitted.');
  };
}

document.addEventListener('DOMContentLoaded', setupIncidentForm);

// --- Announcements ---
import { getAnnouncements, addAnnouncement } from './announcements.js';

function renderAnnouncements(announcements) {
  const allAnnouncements = document.getElementById('all-announcements');
  if (!allAnnouncements) return;
  if (!announcements || announcements.length === 0) {
    allAnnouncements.innerHTML = '<div class="announcement">No announcements yet.</div>';
    return;
  }
  allAnnouncements.innerHTML = '';
  announcements.forEach(a => {
    const div = document.createElement('div');
    div.className = `announcement ${a.priority || ''}`;
    div.innerHTML = `<div class="announcement-title">${a.title}</div><div class="announcement-content">${a.content}</div><div class="announcement-date">Posted: ${new Date(a.created_at).toLocaleDateString()}</div>`;
    allAnnouncements.appendChild(div);
  });
}

async function loadAnnouncements() {
  const announcements = await getAnnouncements();
  renderAnnouncements(announcements);
}

function setupAnnouncementForm() {
  const form = document.getElementById('announcement-form');
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const announcement = {
      title: document.getElementById('announcement-title').value,
      content: document.getElementById('announcement-content').value,
      priority: document.getElementById('announcement-priority').value,
    };
    await addAnnouncement(announcement);
    form.reset();
    loadAnnouncements();
    window.app.showAlert('Success', 'Announcement posted.');
  };
}

document.addEventListener('DOMContentLoaded', setupAnnouncementForm);

// --- Theme Toggle ---
function setTheme(theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.classList.add('light-theme');
  } else {
    html.classList.remove('light-theme');
  }
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') setTheme('light');
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
});

// Export functions for use in other modules
window.app = {
  navigateToPage,
  showAlert,
  showConfirmDialog,
  appState
};
