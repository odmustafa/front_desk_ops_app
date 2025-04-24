/**
 * Front Desk Ops Application - Check-In Module
 * Handles member check-in, ID scanning, and membership verification
 */

// DOM Elements
const scanIdBtn = document.getElementById('scan-id-btn');
const idPhoto = document.getElementById('id-photo');
const idFirstName = document.getElementById('id-first-name');
const idLastName = document.getElementById('id-last-name');
const idDob = document.getElementById('id-dob');
const profilePhoto = document.getElementById('profile-photo');
const accountFirstName = document.getElementById('account-first-name');
const accountLastName = document.getElementById('account-last-name');
const accountBirthday = document.getElementById('account-birthday');
const accountEmail = document.getElementById('account-email');
const membershipStatus = document.getElementById('membership-status');
const membershipPlan = document.getElementById('membership-plan');
const membershipExpiration = document.getElementById('membership-expiration');
const membershipDues = document.getElementById('membership-dues');
const membershipInterest = document.getElementById('membership-interest');
const matchingAccounts = document.getElementById('matching-accounts');
const matchingAccountsList = document.getElementById('matching-accounts-list');
const passVerificationBtn = document.getElementById('pass-verification-btn');
const denyVerificationBtn = document.getElementById('deny-verification-btn');
const beginOnboardingBtn = document.getElementById('begin-onboarding-btn');
const checkInBtn = document.getElementById('check-in-btn');

// Check-in state
const checkInState = {
  idScanned: false,
  accountMatched: false,
  verificationPassed: false,
  currentIdData: null,
  matchedAccounts: [],
  selectedAccount: null,
  isOnboarding: false
};

// Initialize the check-in module
document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners if we're on the check-in page initially
  if (document.getElementById('check-in')) {
    setupCheckInEventListeners();
  }
});

// Add a custom event listener for view changes
document.addEventListener('viewLoaded', (event) => {
  // Check if the check-in view was loaded
  if (event.detail && event.detail.view === 'check-in') {
    // Set up event listeners
    setupCheckInEventListeners();
  }
});

// Export the initialization function for direct calling from views.js
window.initCheckIn = function() {
  setupCheckInEventListeners();
};

/**
 * Set up event listeners for the check-in page
 */
function setupCheckInEventListeners() {
  // Scan ID button
  if (scanIdBtn) {
    scanIdBtn.addEventListener('click', handleIdScan);
  }
  
  // Pass verification button
  if (passVerificationBtn) {
    passVerificationBtn.addEventListener('click', handlePassVerification);
  }
  
  // Deny verification button
  if (denyVerificationBtn) {
    denyVerificationBtn.addEventListener('click', handleDenyVerification);
  }
  
  // Begin onboarding button
  if (beginOnboardingBtn) {
    beginOnboardingBtn.addEventListener('click', handleBeginOnboarding);
  }
  
  // Check-in button
  if (checkInBtn) {
    checkInBtn.addEventListener('click', handleCheckIn);
  }
}

/**
 * Handle ID scanning
 */
async function handleIdScan() {
  try {
    // In a real implementation, this would connect to the Scan-ID software
    // For now, we'll simulate the scanning process
    
    // Show loading state
    scanIdBtn.disabled = true;
    scanIdBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Scanning...';
    
    // Simulate API call to the Scan-ID software
    const scanData = await simulateScanId();
    
    // Process the scan data
    processScanData(scanData);
    
    // Reset button state
    scanIdBtn.disabled = false;
    scanIdBtn.textContent = 'Scan ID';
    
    // Enable verification buttons
    passVerificationBtn.disabled = false;
    denyVerificationBtn.disabled = false;
    
  } catch (error) {
    logger.error('Error scanning ID', { error });
    window.app.showAlert('Error', 'Failed to scan ID. Please try again.');
    
    // Reset button state
    scanIdBtn.disabled = false;
    scanIdBtn.textContent = 'Scan ID';
  }
}

/**
 * Simulate ID scanning (for development purposes)
 * @returns {Promise} - Resolves with simulated scan data
 */
function simulateScanId() {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate scan data from Scan-ID software
      const scanData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        idNumber: 'TX12345678',
        issuedDate: '2018-03-10',
        expiryDate: '2026-03-10',
        isUnderage: false,
        photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAFP0lEQVR4nO2dW0hcVxTG/zWjMcYxGhON0YqJxqRVUkyLbVqloLRQaB/6VijoQ6FQCoU+lEKhfSt9KpS+tIVCKX0KQpVSqIVKm5qmSUyiJjFRY2J0JjFGM2p0pnP6kJnCZO7ey5x99j57zfcHA7Nnzlnru/vsvdfeZ68tSCmllFJKKaWUUkoppZRSSiklpVQAngKwA0AzgCYAjQDqAFQDqARQBqAUQBGAQgB5AOIA5gHMAJgGMAFgDMAIgEEAAwD6AcwG/UGCUgGAFwF0AugBcBvAEoBlA7YIYBDAVQCXAJwDUBHAZwxcxwCcB3ADwAMYM0GXHQVwCcBxRDxqagGcAXAHwZuQzqYBfA/gGKLVTBYCeBvATzDfDJlsAMBbAPIVPXtm1QjgYwCTCN8EXTYBoBtAg4LnL6RyALwC4FdEzwRdNgLgZUTgTLABwLcAFhC+CSZtHsA3AOqZn5mVKgF8BGAe4T98UzYH4EMAJYzPz5hOAPgD4T9sbjsA4ASz+UZ1CsAdhP9wVdkQgJPM/qTVcQB/IfyHqdr+BPACs09p6QSAWYQ/+SBsBsApRr+S6gSAewh/0kHaLIBXmXzLqNcQnYEfp80DeJ3Jv7TKB/Apwp9k2PYJgDwGP9dVDuBrhD+5KNhXAEoZfF1TJYAfEP6komQ/Ym0+h1UFAHoR/mSiaL0ACg35vKoqALcQ/iSibLcAlBvwfUUVAH5D+BOIuv0KoMyA/wDWJoGGEP7gi8EGsT6JmLXyEb1ZWRl2C8DjWXqwojwAVxB+octkl7E2X5SVTiP8ApfRTmXhxYpOIvzCltneyMKPZzqK6K0RiZItAziShS/PdBjAIsIvbJltEcChLHx5qkYADxF+YctuD7A2O2xERQDuIvyClsXuYm2JpxF9gvALWTb7mODPqg4i+rO/UbFlAIcI/jzVY1hb7Bd2wcpqfyODCcZPCA7IZJ8TfFpRB8IvXNmtneATAGCvXvYVgU0CeILg14rKAfwZ8sOV3e5jbZY4rfIBfEtwQCb7huDbinYh/IIpm+0i+AYAKAXwR8gPVzb7HYRtdl8QnJDJLhL8W1E9ovUjBlG1JQAHkioXwHWCIzLZNaydDaZVJ8EJmewCwb8V7UH4BVM220vwDwBQAuBuyA9XNrsDwl7fzwlOyGRdBP9WtB3hF0zZbDvBPwBAMYBbIT9c2WwQhO11FwmOyGQXCP6taBvCL5iy2TaCfwCAIgA3Q364stlNEPb6fkZwRCbrJPi3oq0Iv2DKZlsJ/gEAhQBuhPxwZbMbIGyvO09wRCY7R/BvRVsQfsGUzbYQ/AMA5CO6P2IQVesHYXvdWYIjMlkHwb8VbUb4BVM220zwDwCQh+j+iEFUrQ+E7XWdBEdksg6CfytqRPgFUzZrJPgHAMhFdH/EIKrWC8L2ujMER2SyDoJ/K2pA+AVTNmsg+AcAyEF0f8QgqtYDwva60wRHZLLTBP9WVI/wC6Zs1kDwDwCQg+j+iEFU7ToI2+tOERyRyU4R/FtRHcIvmLJZHcE/AEA2ovsXMYiq/QTC9rqTBEdkspME/1ZUi/ALpmxWS/APAJANoC/khyub9YGwve4EwRGZ7ATBvxXVIPyCKZvVEPwDAGQB6A354cpmvSBsrzse8sOVzY4T/FtRNcIvmLJZNcE/AEAWgGshP1zZ7BoI2+uOhfxwZbNjBP9WVIXwC6ZsVkXwDwCQCeBqyA9XNrsKwva6oyE/XNnsKMG/FVUi/IIpm1US/AMAZCLYv4hBtlUQ9voeQfiFKpsdIfi3ogqEXzBlswqCfwCADKz9RQyyrZoI/q2oHOEXTNmsnOAfACADwJWQH65sdgWE7XWHQ364stlhgn8rKkP4BVM2KyP4BwD4H9ZAi+ZSyF9JAAAAAElFTkSuQmCC'
      };
      
      resolve(scanData);
    }, 1500);
  });
}

/**
 * Process scan data from ID
 * @param {Object} scanData - The data from the scanned ID
 */
function processScanData(scanData) {
  // Store the scan data in the state
  checkInState.currentIdData = scanData;
  checkInState.idScanned = true;
  
  // Update the UI with the scan data
  idFirstName.value = scanData.firstName;
  idLastName.value = scanData.lastName;
  idDob.value = formatDate(scanData.dateOfBirth);
  idPhoto.src = scanData.photoBase64;
  
  // Check if the person is underage
  if (scanData.isUnderage) {
    window.app.showAlert('Age Verification Failed', 'This ID indicates the person is under 21 years of age. Membership cannot be processed.');
    denyVerificationBtn.classList.add('shake');
    setTimeout(() => {
      denyVerificationBtn.classList.remove('shake');
    }, 500);
  }
  
  // Search for matching accounts in Wix
  searchWixAccounts(scanData);
}

/**
 * Search for matching accounts in Wix
 * @param {Object} scanData - The data from the scanned ID
 */
async function searchWixAccounts(scanData) {
  try {
    // In a real implementation, this would call the Wix API
    // For now, we'll simulate the API call
    
    // Simulate API call to Wix
    const accounts = await simulateWixSearch(scanData);
    
    // Store the matching accounts in the state
    checkInState.matchedAccounts = accounts;
    
    // Display matching accounts
    displayMatchingAccounts(accounts);
    
  } catch (error) {
    logger.error('Error searching Wix accounts', { error });
    window.app.showAlert('Error', 'Failed to search for matching accounts. Please try again.');
  }
}

/**
 * Simulate Wix account search (for development purposes)
 * @param {Object} scanData - The data from the scanned ID
 * @returns {Promise} - Resolves with simulated account data
 */
function simulateWixSearch(scanData) {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate account data from Wix
      const accounts = [
        {
          id: 'wix123',
          firstName: scanData.firstName,
          lastName: scanData.lastName,
          email: 'john.doe@example.com',
          birthday: scanData.dateOfBirth,
          membership: {
            status: 'Active',
            plan: 'Monthly',
            expiration: '2025-05-15',
            dues: 'N',
            interest: 'A, D'
          }
        }
      ];
      
      // If this is the first account, add a second one with slight name variation
      if (scanData.firstName === 'John') {
        accounts.push({
          id: 'wix456',
          firstName: 'Jon', // Slight variation
          lastName: scanData.lastName,
          email: 'jon.doe@example.com',
          birthday: scanData.dateOfBirth,
          membership: {
            status: 'Inactive',
            plan: 'None',
            expiration: 'N/A',
            dues: 'R',
            interest: 'D'
          }
        });
      }
      
      resolve(accounts);
    }, 1000);
  });
}

/**
 * Display matching accounts in the UI
 * @param {Array} accounts - The matching accounts from Wix
 */
function displayMatchingAccounts(accounts) {
  // Clear the list
  matchingAccountsList.innerHTML = '';
  
  if (accounts.length === 0) {
    // No matching accounts found
    window.app.showAlert('No Matches', 'No matching accounts found. Please check the ID or create a new account.');
    return;
  }
  
  if (accounts.length === 1) {
    // Only one match, select it automatically
    selectAccount(accounts[0]);
  } else {
    // Multiple matches, show the list for selection
    accounts.forEach(account => {
      const listItem = document.createElement('a');
      listItem.href = '#';
      listItem.className = 'list-group-item list-group-item-action';
      listItem.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${account.firstName} ${account.lastName}</h6>
          <small>${account.membership.status}</small>
        </div>
        <p class="mb-1">${account.email}</p>
        <small>Birthday: ${formatDate(account.birthday)}</small>
      `;
      
      // Add click event to select this account
      listItem.addEventListener('click', () => {
        // Remove active class from all items
        document.querySelectorAll('#matching-accounts-list .list-group-item').forEach(item => {
          item.classList.remove('active');
        });
        
        // Add active class to this item
        listItem.classList.add('active');
        
        // Select this account
        selectAccount(account);
      });
      
      matchingAccountsList.appendChild(listItem);
    });
    
    // Show the matching accounts section
    matchingAccounts.classList.add('show');
  }
}

/**
 * Select an account and display its information
 * @param {Object} account - The selected account
 */
function selectAccount(account) {
  // Store the selected account in the state
  checkInState.selectedAccount = account;
  checkInState.accountMatched = true;
  
  // Update the UI with the account data
  accountFirstName.value = account.firstName;
  accountLastName.value = account.lastName;
  accountBirthday.value = formatDate(account.birthday);
  accountEmail.value = account.email;
  
  // Update membership information
  membershipStatus.textContent = account.membership.status;
  membershipPlan.textContent = account.membership.plan;
  membershipExpiration.textContent = account.membership.expiration;
  membershipDues.textContent = account.membership.dues;
  membershipInterest.textContent = account.membership.interest;
  
  // Update status styling
  if (account.membership.status === 'Active') {
    membershipStatus.className = 'text-success';
  } else {
    membershipStatus.className = 'text-danger';
  }
  
  // Enable check-in button if not onboarding
  if (!checkInState.isOnboarding) {
    checkInBtn.disabled = false;
  }
}

/**
 * Handle passing ID verification
 */
function handlePassVerification() {
  // Check if ID has been scanned and account has been matched
  if (!checkInState.idScanned || !checkInState.accountMatched) {
    window.app.showAlert('Error', 'Please scan an ID and match an account before verifying.');
    return;
  }
  
  // Set verification as passed
  checkInState.verificationPassed = true;
  
  // Update the profile photo with the ID photo
  profilePhoto.src = checkInState.currentIdData.photoBase64;
  
  // If this is an onboarding process, complete it
  if (checkInState.isOnboarding) {
    completeOnboarding();
  } else {
    // Enable check-in button
    checkInBtn.disabled = false;
    
    window.app.showAlert('Verification Passed', 'ID verification has been passed. The member can now be checked in.');
  }
}

/**
 * Handle denying ID verification
 */
function handleDenyVerification() {
  window.app.showConfirmDialog(
    'Deny Verification',
    'Are you sure you want to deny ID verification? This will cancel the current process.',
    () => {
      // Reset the check-in form
      resetCheckInForm();
      
      // Navigate back to the dashboard
      window.app.navigateToPage('dashboard');
      
      window.app.showAlert('Verification Denied', 'ID verification has been denied. The process has been cancelled.');
    }
  );
}

/**
 * Handle beginning the onboarding process
 */
function handleBeginOnboarding() {
  // Set onboarding flag
  checkInState.isOnboarding = true;
  
  // Update UI for onboarding mode
  beginOnboardingBtn.style.display = 'none';
  checkInBtn.style.display = 'none';
  
  // Prompt to scan ID
  window.app.showAlert('Begin Onboarding', 'Please scan the member\'s ID to begin the onboarding process.');
  
  // Focus on scan button
  scanIdBtn.focus();
}

/**
 * Complete the onboarding process
 */
function completeOnboarding() {
  // In a real implementation, this would create a new member in the database
  // and activate their membership
  
  window.app.showAlert('Onboarding Complete', 'Member has been successfully onboarded and their membership has been activated.');
  
  // Reset the check-in form
  resetCheckInForm();
  
  // Navigate back to the dashboard
  window.app.navigateToPage('dashboard');
}

/**
 * Handle member check-in
 */
function handleCheckIn() {
  // Check if ID has been scanned, account has been matched, and verification has been passed
  if (!checkInState.idScanned || !checkInState.accountMatched || !checkInState.verificationPassed) {
    window.app.showAlert('Error', 'Please complete the ID verification process before checking in.');
    return;
  }
  
  // In a real implementation, this would call the Wix API to record the check-in
  // For now, we'll simulate the API call
  
  // Show loading state
  checkInBtn.disabled = true;
  checkInBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
  
  // Simulate API call
  setTimeout(() => {
    // Reset button state
    checkInBtn.disabled = false;
    checkInBtn.textContent = 'Check In';
    
    // Show success message
    window.app.showAlert('Success', `${checkInState.selectedAccount.firstName} ${checkInState.selectedAccount.lastName} has been checked in successfully.`);
    
    // Reset the form
    resetCheckInForm();
  }, 1500);
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format (YYYY-MM-DD)
 * @returns {string} - The formatted date string (MM/DD/YYYY)
 */
function formatDate(dateString) {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Invalid date
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Reset the check-in form
 */
function resetCheckInForm() {
  // Reset state
  checkInState.idScanned = false;
  checkInState.accountMatched = false;
  checkInState.verificationPassed = false;
  checkInState.currentIdData = null;
  checkInState.matchedAccounts = [];
  checkInState.selectedAccount = null;
  checkInState.isOnboarding = false;
  
  // Reset UI elements
  idPhoto.src = '../assets/placeholder-profile.svg';
  idFirstName.value = '';
  idLastName.value = '';
  idDob.value = '';
  
  profilePhoto.src = '../assets/placeholder-profile.svg';
  accountFirstName.value = '';
  accountLastName.value = '';
  accountBirthday.value = '';
  accountEmail.value = '';
  
  membershipStatus.textContent = 'Inactive';
  membershipStatus.className = 'text-danger';
  membershipPlan.textContent = 'None';
  membershipExpiration.textContent = 'N/A';
  membershipDues.textContent = 'N';
  membershipInterest.textContent = '';
  
  // Hide matching accounts section
  matchingAccounts.classList.remove('show');
  matchingAccountsList.innerHTML = '';
  
  // Disable buttons
  passVerificationBtn.disabled = true;
  denyVerificationBtn.disabled = true;
  checkInBtn.disabled = true;
  
  // Reset button visibility
  beginOnboardingBtn.style.display = 'inline-block';
  checkInBtn.style.display = 'inline-block';
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format (YYYY-MM-DD)
 * @returns {string} - The formatted date string (MM/DD/YYYY)
 */
function formatDate(dateString) {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
