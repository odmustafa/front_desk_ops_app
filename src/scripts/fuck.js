/**
 * Front Desk Ops Application - FUCK Tab Module
 * Handles the FUCK tab functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('FUCK tab script loaded');
  
  // Ensure the FUCK tab is properly initialized
  initializeFuckTab();
  
  // Add a click handler to the FUCK tab navigation link
  const fuckNavLink = document.querySelector('a.nav-link[data-page="fuck"]');
  if (fuckNavLink) {
    console.log('Found FUCK tab navigation link');
    fuckNavLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('FUCK tab clicked directly');
      showFuckTab();
    });
  } else {
    console.error('FUCK tab navigation link not found');
  }
});

/**
 * Initialize the FUCK tab
 */
function initializeFuckTab() {
  console.log('Initializing FUCK tab');
  
  // Create the FUCK tab content if it doesn't exist
  if (!document.getElementById('fuck')) {
    createFuckTabContent();
  }
}

/**
 * Create the FUCK tab content
 */
function createFuckTabContent() {
  // Add the FUCK tab content to the main content area
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content area not found');
    return;
  }
  
  // Create the FUCK tab content
  const fuckTab = document.createElement('div');
  fuckTab.id = 'fuck';
  fuckTab.className = 'content-page';
  fuckTab.innerHTML = `
    <h2>FUCK</h2>
    <div class="row">
      <!-- Scan ID Section -->
      <div class="col-md-6">
        <div class="card mb-4">
          <div class="card-header">
            <h5>Scan ID</h5>
          </div>
          <div class="card-body">
            <div class="text-center mb-3">
              <img src="assets/placeholder-profile.svg" alt="ID Photo" class="id-photo" id="fuck-id-photo">
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-first-name">First Name</label>
                  <input type="text" class="form-control" id="fuck-id-first-name" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-last-name">Last Name</label>
                  <input type="text" class="form-control" id="fuck-id-last-name" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-dob">Date of Birth</label>
                  <input type="text" class="form-control" id="fuck-id-dob" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-exp-date">Exp. Date (ID)</label>
                  <input type="text" class="form-control" id="fuck-id-exp-date" disabled>
                </div>
              </div>
            </div>
            <div class="text-center mt-3">
              <button class="btn btn-primary" id="fuck-scan-id-btn">Scan ID</button>
            </div>
          </div>
        </div>
        
        <!-- Search Section -->
        <div class="card">
          <div class="card-header">
            <h5>Search</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-8">
                <div class="form-group mb-3">
                  <label for="fuck-search-input">Search by Name or Date of Birth</label>
                  <input type="text" class="form-control" id="fuck-search-input" placeholder="Enter name or DOB...">
                </div>
              </div>
              <div class="col-md-4 d-flex align-items-end">
                <button class="btn btn-primary w-100" id="fuck-search-btn">Search</button>
              </div>
            </div>
            
            <!-- Matching Accounts Section (Hidden by Default) -->
            <div id="fuck-matching-accounts" class="matching-accounts mt-4" style="display: none;">
              <h6>Matching Accounts</h6>
              <div class="list-group" id="fuck-account-list">
                <!-- Will be populated dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Account Information Section -->
      <div class="col-md-6">
        <div class="card mb-4">
          <div class="card-header">
            <h5>Account Information</h5>
          </div>
          <div class="card-body">
            <div class="text-center mb-3">
              <img src="assets/placeholder-profile.svg" alt="Profile Photo" class="profile-photo" id="fuck-profile-photo">
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-first-name">First Name</label>
                  <input type="text" class="form-control" id="fuck-account-first-name" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-last-name">Last Name</label>
                  <input type="text" class="form-control" id="fuck-account-last-name" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-birthday">Birthday</label>
                  <input type="text" class="form-control" id="fuck-account-birthday" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-email">Email</label>
                  <input type="email" class="form-control" id="fuck-account-email" disabled>
                </div>
              </div>
            </div>
            <div class="form-group mb-3">
              <label for="fuck-membership-status">Current Membership</label>
              <input type="text" class="form-control" id="fuck-membership-status" disabled>
            </div>
          </div>
        </div>
        
        <!-- Biometrics Section -->
        <div class="card">
          <div class="card-header">
            <h5>Biometrics</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-height">Height</label>
                  <input type="text" class="form-control" id="fuck-height" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-weight">Weight</label>
                  <input type="text" class="form-control" id="fuck-weight" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-eye-color">Eye Color</label>
                  <input type="text" class="form-control" id="fuck-eye-color" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-hair-color">Hair Color</label>
                  <input type="text" class="form-control" id="fuck-hair-color" disabled>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add the FUCK tab to the main content area
  mainContent.appendChild(fuckTab);
  
  // Set up event listeners for the FUCK tab
  setupFuckTabEventListeners();
});



/**
 * Create the FUCK tab content
 */
function createFuckTabContent() {
  // Add the FUCK tab content to the main content area
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content area not found');
    return;
  }
  
  // Create the FUCK tab content
  const fuckTab = document.createElement('div');
  fuckTab.id = 'fuck';
  fuckTab.className = 'content-page';
  fuckTab.innerHTML = `
    <h2>FUCK</h2>
    <div class="row">
      <!-- Scan ID Section -->
      <div class="col-md-6">
        <div class="card mb-4">
          <div class="card-header">
            <h5>Scan ID</h5>
          </div>
          <div class="card-body">
            <div class="text-center mb-3">
              <img src="assets/placeholder-profile.svg" alt="ID Photo" class="id-photo" id="fuck-id-photo">
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-first-name">First Name</label>
                  <input type="text" class="form-control" id="fuck-id-first-name" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-last-name">Last Name</label>
                  <input type="text" class="form-control" id="fuck-id-last-name" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-dob">Date of Birth</label>
                  <input type="text" class="form-control" id="fuck-id-dob" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-id-exp-date">Exp. Date (ID)</label>
                  <input type="text" class="form-control" id="fuck-id-exp-date" disabled>
                </div>
              </div>
            </div>
            <div class="text-center mt-3">
              <button class="btn btn-primary" id="fuck-scan-id-btn">Scan ID</button>
            </div>
          </div>
        </div>
        
        <!-- Search Section -->
        <div class="card">
          <div class="card-header">
            <h5>Search</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-8">
                <div class="form-group mb-3">
                  <label for="fuck-search-input">Search by Name or Date of Birth</label>
                  <input type="text" class="form-control" id="fuck-search-input" placeholder="Enter name or DOB...">
                </div>
              </div>
              <div class="col-md-4 d-flex align-items-end">
                <button class="btn btn-primary w-100" id="fuck-search-btn">Search</button>
              </div>
            </div>
            
            <!-- Matching Accounts Section (Hidden by Default) -->
            <div id="fuck-matching-accounts" class="matching-accounts mt-4" style="display: none;">
              <h6>Matching Accounts</h6>
              <div class="list-group" id="fuck-account-list">
                <!-- Will be populated dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Account Information Section -->
      <div class="col-md-6">
        <div class="card mb-4">
          <div class="card-header">
            <h5>Account Information</h5>
          </div>
          <div class="card-body">
            <div class="text-center mb-3">
              <img src="assets/placeholder-profile.svg" alt="Profile Photo" class="profile-photo" id="fuck-profile-photo">
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-first-name">First Name</label>
                  <input type="text" class="form-control" id="fuck-account-first-name" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-last-name">Last Name</label>
                  <input type="text" class="form-control" id="fuck-account-last-name" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-birthday">Birthday</label>
                  <input type="text" class="form-control" id="fuck-account-birthday" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-account-email">Email</label>
                  <input type="email" class="form-control" id="fuck-account-email" disabled>
                </div>
              </div>
            </div>
            <div class="form-group mb-3">
              <label for="fuck-membership-status">Current Membership</label>
              <input type="text" class="form-control" id="fuck-membership-status" disabled>
            </div>
          </div>
        </div>
        
        <!-- Biometrics Section -->
        <div class="card">
          <div class="card-header">
            <h5>Biometrics</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-height">Height</label>
                  <input type="text" class="form-control" id="fuck-height" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-weight">Weight</label>
                  <input type="text" class="form-control" id="fuck-weight" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-eye-color">Eye Color</label>
                  <input type="text" class="form-control" id="fuck-eye-color" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-3">
                  <label for="fuck-hair-color">Hair Color</label>
                  <input type="text" class="form-control" id="fuck-hair-color" disabled>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add the FUCK tab to the main content area
  mainContent.appendChild(fuckTab);
  console.log('FUCK tab content created and added to the DOM');
}

/**
 * Set up event listeners for the FUCK tab
 */
function setupFuckTabEventListeners() {
  // Scan ID button
  const scanIdBtn = document.getElementById('fuck-scan-id-btn');
  if (scanIdBtn) {
    scanIdBtn.addEventListener('click', () => {
      console.log('Scan ID button clicked');
      simulateScanId();
    });
  }
  
  // Search button
  const searchBtn = document.getElementById('fuck-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      console.log('Search button clicked');
      searchAccounts();
    });
  }
}

/**
 * Simulate scanning an ID
 */
function simulateScanId() {
  // Simulate ID scan with sample data
  const sampleIdData = {
    firstName: 'John',
    lastName: 'Doe',
    dob: '01/15/1985',
    expDate: '12/31/2025'
  };
  
  // Update ID fields
  document.getElementById('fuck-id-first-name').value = sampleIdData.firstName;
  document.getElementById('fuck-id-last-name').value = sampleIdData.lastName;
  document.getElementById('fuck-id-dob').value = sampleIdData.dob;
  document.getElementById('fuck-id-exp-date').value = sampleIdData.expDate;
  
  // Update ID photo
  document.getElementById('fuck-id-photo').src = 'assets/sample-id-photo.jpg';
  
  // Automatically search for matching accounts
  searchAccounts();
}

/**
 * Search for accounts matching the ID data
 */
function searchAccounts() {
  // Get search input value or use ID data if available
  const searchInput = document.getElementById('fuck-search-input');
  const firstName = document.getElementById('fuck-id-first-name').value;
  const lastName = document.getElementById('fuck-id-last-name').value;
  
  const searchTerm = searchInput.value || `${firstName} ${lastName}`.trim();
  
  if (!searchTerm) {
    console.log('No search term provided');
    return;
  }
  
  console.log(`Searching for accounts matching: ${searchTerm}`);
  
  // Simulate search results with sample data
  const sampleResults = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      dob: '01/15/1985',
      email: 'john.doe@example.com',
      membership: 'Premium Monthly'
    },
    {
      id: 2,
      firstName: 'John',
      lastName: 'Doe',
      dob: '03/22/1990',
      email: 'johndoe90@example.com',
      membership: 'Basic Annual'
    }
  ];
  
  // Display matching accounts
  displayMatchingAccounts(sampleResults);
}

/**
 * Display matching accounts in the UI
 * @param {Array} accounts - Array of account objects
 */
function displayMatchingAccounts(accounts) {
  const matchingAccountsSection = document.getElementById('fuck-matching-accounts');
  const accountList = document.getElementById('fuck-account-list');
  
  // Clear previous results
  accountList.innerHTML = '';
  
  if (accounts.length === 0) {
    accountList.innerHTML = '<div class="list-group-item">No matching accounts found</div>';
    matchingAccountsSection.style.display = 'block';
    return;
  }
  
  // Add each account to the list
  accounts.forEach(account => {
    const accountItem = document.createElement('a');
    accountItem.href = '#';
    accountItem.className = 'list-group-item list-group-item-action';
    accountItem.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h6 class="mb-1">${account.firstName} ${account.lastName}</h6>
        <small>${account.membership}</small>
      </div>
      <p class="mb-1">DOB: ${account.dob}</p>
      <small class="text-muted">${account.email}</small>
    `;
    
    // Add click event to load account details
    accountItem.addEventListener('click', (e) => {
      e.preventDefault();
      loadAccountDetails(account);
    });
    
    accountList.appendChild(accountItem);
  });
  
  // Show the matching accounts section
  matchingAccountsSection.style.display = 'block';
}

/**
 * Load account details into the Account Information section
 * @param {Object} account - Account object with details
 */
function loadAccountDetails(account) {
  // Update account information fields
  document.getElementById('fuck-account-first-name').value = account.firstName;
  document.getElementById('fuck-account-last-name').value = account.lastName;
  document.getElementById('fuck-account-birthday').value = account.dob;
  document.getElementById('fuck-account-email').value = account.email;
  document.getElementById('fuck-membership-status').value = account.membership;
  
  // Update profile photo
  document.getElementById('fuck-profile-photo').src = 'assets/sample-profile.jpg';
  
  // Update biometrics with sample data
  document.getElementById('fuck-height').value = '5\'10"';
  document.getElementById('fuck-weight').value = '175 lbs';
  document.getElementById('fuck-eye-color').value = 'Brown';
  document.getElementById('fuck-hair-color').value = 'Black';
  
  console.log(`Loaded account details for ${account.firstName} ${account.lastName}`);
}
