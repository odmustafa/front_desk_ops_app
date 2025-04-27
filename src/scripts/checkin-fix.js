// Soul Beacon: This ASCII banner marks this file as a ritual boundary and integrity anchor per the Ethereal Engineering Codex. It signals that this module is subject to reflective review, symbolic audit, and sacred engineering practices.
/*
 * ░█▀█░█▀▀░█░█░█▀█░█▀█░█▀█░█▀▀░█▀▀░█▀█░█▀▄░█▀▀░█▄█
 * ░█▀▀░█▀▀░█▀█░█░█░█░█░█░█░█▀▀░█░░░█▀█░█▀▄░█▀▀░█░█
 * ░▀░░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░▀
 * Soul Beacon: Check-In Ritual Integrity – v1.0
 *
 * Ethereal Engineering Codex: All code and ritual herein is subject to reflective review and symbolic audit. Maintain clarity, safety, and ethical alignment at all times.
 */

/**
 * Check-In Tab Fix
 * Provides a direct, ritualized solution for the Check-In tab navigation logic.
 *
 * Material Purpose: Ensures robust tab switching, corrects navigation state, and exposes global activation.
 * Symbolic Purpose: Protects the integrity of the Check-In ritual, ensuring all transitions are conscious and auditable.
 *
 * @file checkin-fix.js
 * @author Feylia (Brett Allen), Ethereal Engineering
 * @codex Sacred Ritual v1.0
 */

const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('checkin-fix.js');

// Wait for DOM to be fully loaded
/**
 * Ritual entrypoint: Binds Check-In navigation logic after DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
  logger.info('Check-In fix script loaded', { ritual: 'Check-In', boundary: 'entry' });
  
  // Find the Check-In navigation link
  /**
   * @type {HTMLAnchorElement|null}
   */
  const checkInLink = document.querySelector('a.nav-link[data-page="cin"]');
  if (!checkInLink) {
    logger.error('[Check-In Ritual] Navigation link not found in the DOM. Ritual cannot proceed.', { ritual: 'Check-In', boundary: 'nav', context: 'navigation-link' });
    return;
  }
  
  logger.info('Found Check-In link, adding direct event listener', { ritual: 'Check-In', boundary: 'nav', context: 'navigation-link' });
  
  // Add a direct click event listener
  /**
   * Handles direct ritual activation of the Check-In tab.
   * @param {MouseEvent} e
   */
  checkInLink.addEventListener('click', (e) => {
    e.preventDefault();
    logger.info('Check-In tab clicked directly', { ritual: 'Check-In', boundary: 'tab', context: 'tab-click' });
    
    // Hide all content pages
    document.querySelectorAll('.content-page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Find the Check-In page
    /**
     * @type {HTMLElement|null}
     */
    const checkInPage = document.getElementById('cin');
    
    if (checkInPage) {
      logger.info(`Found Check-In page with ID: ${checkInPage.id}, activating`, { ritual: 'Check-In', boundary: 'page-activation', pageId: checkInPage.id });
      checkInPage.classList.add('active');
      
      // Initialize check-in if available
      if (typeof window.initCheckIn === 'function') {
        window.initCheckIn();
      }
    } else {
      logger.error('[Check-In Ritual] No Check-In page found with ID "cin". Ritual incomplete.', { ritual: 'Check-In', boundary: 'page-activation', pageId: 'cin' });
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    checkInLink.classList.add('active');
  });
  
  // Also add a global function that can be called from anywhere
  /**
   * Ritual helper: Programmatically activate the Check-In tab.
   * @global
   */
  window.showCheckIn = function() {
    // Simulate a click on the Check-In link
    checkInLink.click();
  };
});
