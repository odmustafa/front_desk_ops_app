// scripts/views.js
// SPA dynamic loader for Tribute Front Desk Ops

const VIEW_MAP = {
  dashboard: 'dashboard.html',
  checkin: 'checkin.html',
  staff: 'staff.html',
  'knowledge-base': 'knowledge-base.html',
  incidents: 'incidents.html',
  announcements: 'announcements.html',
  settings: 'settings.html',
  // debug: 'debug.html' // Add if/when debug partial is created
};

async function loadView(viewKey) {
  const filename = VIEW_MAP[viewKey];
  if (!filename) return;
  try {
    const res = await fetch(`../views/partials/${filename}`);
    if (!res.ok) throw new Error('Failed to load view: ' + filename);
    document.getElementById('content-area').innerHTML = await res.text();
    setActiveNav(viewKey);
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

  // Load initial view based on hash or default
  const initial = window.location.hash.replace('#', '') || 'dashboard';
  loadView(initial);
});
