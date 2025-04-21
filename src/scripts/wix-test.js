/**
 * Simple Wix API Test Script
 * This script provides a simple test function to verify Wix API connectivity
 */

// Global state for test results
const wixTestState = {
  lastTestResult: null,
  isLoading: false
};

/**
 * Initialize the Wix API test UI
 */
function initWixTest() {
  // Create a test button in the settings page
  const wixSettingsCard = document.querySelector('.card-header:has(h6:contains("Wix Integration"))').closest('.card');
  if (wixSettingsCard) {
    const testContainer = document.createElement('div');
    testContainer.className = 'mt-3 border-top pt-3';
    testContainer.innerHTML = `
      <h6>Wix API Test</h6>
      <div class="d-flex align-items-center">
        <button id="wix-test-button" class="btn btn-sm btn-outline-primary">Run Simple API Test</button>
        <div id="wix-test-status" class="ms-3">Not tested</div>
      </div>
      <div id="wix-test-result" class="mt-2 small" style="max-height: 200px; overflow-y: auto;"></div>
    `;
    
    wixSettingsCard.querySelector('.card-body').appendChild(testContainer);
    
    // Add event listener to the test button
    document.getElementById('wix-test-button').addEventListener('click', runWixApiTest);
  }
}

/**
 * Run a simple Wix API test
 */
async function runWixApiTest() {
  const testButton = document.getElementById('wix-test-button');
  const testStatus = document.getElementById('wix-test-status');
  const testResult = document.getElementById('wix-test-result');
  
  // Prevent multiple test runs
  if (wixTestState.isLoading) {
    return;
  }
  
  // Update UI to loading state
  wixTestState.isLoading = true;
  testButton.disabled = true;
  testStatus.innerHTML = '<span class="text-warning">Testing...</span>';
  testResult.innerHTML = '';
  
  try {
    // Call the test API function
    const result = await window.app.ipcRenderer.invoke('wix:testSimpleApi');
    
    // Store the result
    wixTestState.lastTestResult = result;
    
    // Update UI based on result
    if (result.success) {
      testStatus.innerHTML = '<span class="text-success">Success</span>';
      
      // Format the response data
      const formattedData = JSON.stringify(result.data, null, 2);
      testResult.innerHTML = `<pre class="bg-light p-2 rounded">${formattedData}</pre>`;
    } else {
      testStatus.innerHTML = '<span class="text-danger">Failed</span>';
      testResult.innerHTML = `<div class="text-danger">${result.error}</div>`;
      
      // If there's error details, show them
      if (result.errorDetails) {
        const formattedError = JSON.stringify(result.errorDetails, null, 2);
        testResult.innerHTML += `<pre class="bg-light p-2 rounded mt-2">${formattedError}</pre>`;
      }
    }
  } catch (error) {
    // Handle unexpected errors
    testStatus.innerHTML = '<span class="text-danger">Error</span>';
    testResult.innerHTML = `<div class="text-danger">Unexpected error: ${error.message}</div>`;
  } finally {
    // Reset loading state
    wixTestState.isLoading = false;
    testButton.disabled = false;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initWixTest);
