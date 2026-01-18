/**
 * Internity - External Sites Handler
 * Injected into external job application sites to show confirmation modal
 */

// Listen for messages from the background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SHOW_APPLICATION_MODAL') {
    console.log('[Internity-ExternalSite] Showing application modal');
    // Background sends us the job ID, external URL, and the START timestamp (when user clicked Apply on LinkedIn)
    showApplicationConfirmationModal(request.data.jobId, request.data.externalUrl, request.data.startTimestamp);
    sendResponse({ status: 'modal_shown' });
  }
});

function showApplicationConfirmationModal(jobId, externalUrl, startTimestamp) {
  // startTimestamp = the exact moment they clicked "Apply" on LinkedIn (before coming to this external site)
  // Check if modal already exists
  if (document.getElementById('internity-external-modal')) {
    return;
  }
  
  // Create modal HTML
  const modalHTML = `
    <div id="internity-external-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">✓</div>
        <h1 style="color: #0a66c2; font-size: 24px; margin-bottom: 16px; font-weight: 600;">Application Confirmation</h1>
        <p style="color: #565959; font-size: 16px; margin-bottom: 32px; line-height: 1.5;">Are you still considering applying for this job?</p>
        
        <div style="
          background: #f1f1f1;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          text-align: left;
        ">
          <div style="color: #565959; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Application Site</div>
          <div style="color: #0a66c2; font-size: 14px; word-break: break-all;">${externalUrl}</div>
        </div>
        
        <div style="display: flex; gap: 12px; flex-direction: column;">
          <button id="internity-yes-btn" style="
            padding: 12px 24px;
            background: #31a24c;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">✓ Yes</button>
          
          <button id="internity-no-btn" style="
            padding: 12px 24px;
            background: #c91f16;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">✕ No</button>
        </div>
      </div>
    </div>
  `;
  
  // Insert modal into page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add hover effects
  const yesBtn = document.getElementById('internity-yes-btn');
  const noBtn = document.getElementById('internity-no-btn');
  
  yesBtn.addEventListener('mouseover', () => {
    yesBtn.style.background = '#2a8a41';
    yesBtn.style.transform = 'translateY(-2px)';
    yesBtn.style.boxShadow = '0 4px 12px rgba(49, 162, 76, 0.3)';
  });
  
  yesBtn.addEventListener('mouseout', () => {
    yesBtn.style.background = '#31a24c';
    yesBtn.style.transform = 'none';
    yesBtn.style.boxShadow = 'none';
  });
  
  noBtn.addEventListener('mouseover', () => {
    noBtn.style.background = '#a81810';
    noBtn.style.transform = 'translateY(-2px)';
    noBtn.style.boxShadow = '0 4px 12px rgba(201, 31, 22, 0.3)';
  });
  
  noBtn.addEventListener('mouseout', () => {
    noBtn.style.background = '#c91f16';
    noBtn.style.transform = 'none';
    noBtn.style.boxShadow = 'none';
  });
  
  // Handle Yes button
  yesBtn.addEventListener('click', () => {
    console.log('[Internity-ExternalSite] User confirmed: Yes');
    
    // Calculate total time: from when they clicked Apply on LinkedIn until now
    // This includes: time on LinkedIn + time navigating + time on this external site
    const timeSpentMs = startTimestamp ? Date.now() - startTimestamp : null; // Milliseconds
    const timeSpentSeconds = timeSpentMs ? Math.round(timeSpentMs / 1000) : null; // Convert to seconds
    
    console.log('[Internity-ExternalSite] Time spent:', timeSpentSeconds, 'seconds');
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'APPLIED',
        externalUrl: externalUrl,
        timeSpentSeconds: timeSpentSeconds // How many seconds total from Apply click to Yes click
      }
    }, (response) => {
      console.log('[Internity-ExternalSite] Response:', response);
      removeModal();
    });
  });
  
  // Handle No button
  noBtn.addEventListener('click', () => {
    console.log('[Internity-ExternalSite] User confirmed: No, Not Yet');
    
    // Same calculation: total time from Apply button to No button
    const timeSpentMs = startTimestamp ? Date.now() - startTimestamp : null;
    const timeSpentSeconds = timeSpentMs ? Math.round(timeSpentMs / 1000) : null;
    
    console.log('[Internity-ExternalSite] Time spent:', timeSpentSeconds, 'seconds');
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'SKIPPED',
        externalUrl: externalUrl,
        timeSpentSeconds: timeSpentSeconds
      }
    }, (response) => {
      console.log('[Internity-ExternalSite] Response:', response);
      removeModal();
    });
  });
  
  console.log('[Internity-ExternalSite] Modal created and listeners attached');
}

function removeModal() {
  const modal = document.getElementById('internity-external-modal');
  if (modal) {
    modal.remove();
    console.log('[Internity-ExternalSite] Modal removed');
  }
}
