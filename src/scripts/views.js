/* eslint-env browser */
/* global window, document, setTimeout, setInterval, fetch, CustomEvent, alert */
// scripts/views.js
// SPA dynamic loader for Tribute Front Desk Ops

const VIEW_MAP = {
  dashboard: 'dashboard.html',
  'check-in': 'check-in.html',
  staff: 'staff.html',
  'knowledge-base': 'knowledge-base.html',
  incidents: 'incidents.html',
  announcements: 'announcements.html',
  settings: 'settings.html',
  // debug: 'debug.html' // Add if/when debug partial is created
};

// Staff sub-pages
const STAFF_SUBPAGES = ['directory', 'tasks', 'schedule'];

// Export loadView to the global scope for use by app.js
window.loadView = loadView;

async function loadView(viewKey) {
  const filename = VIEW_MAP[viewKey];
  if (!filename) return;
  try {
    const res = await fetch(`../views/partials/${filename}`);
    if (!res.ok) throw new Error('Failed to load view: ' + filename);
    
    // Get the content area or create one if it doesn't exist
    let contentArea = document.getElementById('content-area');
    if (!contentArea) {
      // If content-area doesn't exist, use main-content as the parent
      const mainContent = document.querySelector('.main-content');
      if (!mainContent) throw new Error('Could not find main-content element');
      
      // Clear the main content area
      mainContent.innerHTML = '';
      
      // Create a new content area
      contentArea = document.createElement('div');
      contentArea.id = 'content-area';
      mainContent.appendChild(contentArea);
    }
    
    // Load the view content
    contentArea.innerHTML = await res.text();
    setActiveNav(viewKey);
    
    // Initialize specific modules based on the loaded view
    setTimeout(() => {
      // Dispatch a custom event that the view has been loaded
      const viewLoadedEvent = new CustomEvent('viewLoaded', {
        detail: { view: viewKey }
      });
      document.dispatchEvent(viewLoadedEvent);
      
      // Initialize staff sub-navigation if we're loading the staff page
      if (viewKey === 'staff') {
        // If loadStaffPage function is available, load the directory page by default
        if (window.loadStaffPage) {
          window.loadStaffPage('directory');
        }
      }
      
      // Initialize check-in page if we're loading it
      if (viewKey === 'check-in') {
        // If initCheckIn function is available, call it
        if (window.initCheckIn) {
          window.initCheckIn();
        }
      }
    }, 100);
  } catch (err) {
    document.getElementById('content-area').innerHTML = `<div class='alert alert-danger'>${err.message}</div>`;
  }
}

function setActiveNav(viewKey) {
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === viewKey) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation click handlers
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewKey = link.getAttribute('data-page');
      loadView(viewKey);
      window.location.hash = viewKey;
    });
  });
  
  // Handle staff sub-navigation through URL hash
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    
    // Check if hash contains a staff subpage (format: staff/subpage)
    if (hash.startsWith('staff/')) {
      const subpage = hash.split('/')[1];
      if (STAFF_SUBPAGES.includes(subpage) && window.loadStaffPage) {
        window.loadStaffPage(subpage);
      }
    }
  });

  // Load initial view based on hash or default
  const hash = window.location.hash.replace('#', '');
  
  // Check if hash contains a staff subpage
  if (hash.startsWith('staff/')) {
    const subpage = hash.split('/')[1];
    loadView('staff');
    // The staff page will load the appropriate subpage in its own initialization
  } else {
    const initial = hash || 'dashboard';
    loadView(initial);
  }
});
