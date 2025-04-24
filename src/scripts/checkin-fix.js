/**
 * Check-In Tab Fix
 * This script provides a direct solution for the Check-In tab navigation
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Check-In fix script loaded');
  
  // Find the Check-In navigation link
  const checkInLink = document.querySelector('a.nav-link[data-page="cin"]');
  if (!checkInLink) {
    console.error('Check-In link not found in the navigation');
    return;
  }
  
  console.log('Found Check-In link, adding direct event listener');
  
  // Add a direct click event listener
  checkInLink.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Check-In tab clicked directly');
    
    // Hide all content pages
    document.querySelectorAll('.content-page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Find the Check-In page
    const checkInPage = document.getElementById('cin');
    
    if (checkInPage) {
      console.log(`Found Check-In page with ID: ${checkInPage.id}, activating`);
      checkInPage.classList.add('active');
      
      // Initialize check-in if available
      if (typeof window.initCheckIn === 'function') {
        window.initCheckIn();
      }
    } else {
      console.error('No Check-In page found with either ID');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    checkInLink.classList.add('active');
  });
  
  // Also add a global function that can be called from anywhere
  window.showCheckIn = function() {
    // Simulate a click on the Check-In link
    checkInLink.click();
  };
});
