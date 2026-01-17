/**
 * Internity - Confirmation Popup
 * Handles user confirmation of job applications
 */

const log = (msg, data) => {
  console.log(`[Internity-Popup] ${msg}`, data || "");
};

// Get stored data when popup opens
chrome.storage.local.get(['lastApplyJobId', 'externalApplicationUrl'], (result) => {
  log("Popup opened with data:", result);
  
  // Display the external URL
  const externalUrl = result.externalApplicationUrl || 'Unknown';
  document.getElementById('external-url').textContent = externalUrl;
});

// Handle Yes button
document.getElementById('yes-btn').addEventListener('click', () => {
  log("User clicked: Yes, I Applied");
  
  chrome.storage.local.get(['lastApplyJobId', 'externalApplicationUrl'], (result) => {
    const jobId = result.lastApplyJobId;
    const externalUrl = result.externalApplicationUrl;
    
    // Send message to background worker to record the status
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'APPLIED',
        externalUrl: externalUrl
      }
    }, (response) => {
      log("Response from background:", response);
      window.close();
    });
  });
});

// Handle No button
document.getElementById('no-btn').addEventListener('click', () => {
  log("User clicked: No, Not Yet");
  
  chrome.storage.local.get(['lastApplyJobId', 'externalApplicationUrl'], (result) => {
    const jobId = result.lastApplyJobId;
    const externalUrl = result.externalApplicationUrl;
    
    // Send message to background worker to record the status
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'SKIPPED',
        externalUrl: externalUrl
      }
    }, (response) => {
      log("Response from background:", response);
      window.close();
    });
  });
});
