/**
 * Internity - Background Service Worker
 * Handles event aggregation and data persistence
 */

const DEBUG = true;
const log = (msg, data) => {
  if (DEBUG) console.log(`[Internity-BG] ${msg}`, data || "");
};

// Global variable to store Easy Apply timeout ID
let easyApplyTimeoutId = null;

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  log("Extension installed - initializing storage");
  chrome.storage.local.set({
    events: [],
    jobPostings: {},
    sessionStarted: Date.now(),
    externalAppTimer: null
  });
});

function getEvents() {
  return new Promise(resolve => {
    chrome.storage.local.get(["events"], result => {
      resolve(result.events || []);
    });
  });
}

function storeEvents(events) {
  chrome.storage.local.set({ events });
}


// Monitor tab updates to detect when user navigates away from LinkedIn to external site
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = tab.url || changeInfo.url;
  
  if (url) {
    log(`[Tab ${tabId}] URL updated:`, url);
    
    // Ignore Chrome internal URLs, about pages, and LinkedIn itself
    if (url.startsWith('chrome://') || url.startsWith('about:')) {
      log(`[Tab ${tabId}] Ignoring Chrome internal URL`);
      return;
    }
    
    if (url.includes('linkedin.com')) {
      log(`[Tab ${tabId}] Still on LinkedIn`);
      return;
    }
    
    // Check if it's a real external site (http/https)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      log(`[Tab ${tabId}] 🌐 External URL detected:`, url);
      
      // Check storage for stored job ID AND that we're expecting external navigation
      chrome.storage.local.get(['lastApplyJobId', 'lastApplyTimestamp', 'timerStarted', 'lastExternalUrl', 'expectingExternalNavigation'], (result) => {
        log(`[Tab ${tabId}] Storage check - lastApplyJobId:`, result.lastApplyJobId, 'expectingExternalNavigation:', result.expectingExternalNavigation);
        
        // Only proceed if we're expecting external navigation (user just clicked Apply and we're waiting for redirect)
        if (!result.expectingExternalNavigation) {
          log(`[Tab ${tabId}] ⚠️ Not expecting external navigation - ignoring this navigation`);
          return;
        }
        
        // If this is a NEW external URL (different from last one), allow it even if timerStarted is true
        const isNewUrl = result.lastExternalUrl !== url;
        
        if (result.lastApplyJobId && (!result.timerStarted || isNewUrl)) {
          log(`[Tab ${tabId}] ✅ Found stored apply job ID:`, result.lastApplyJobId);
          log(`[Tab ${tabId}] 🌐 User navigated to external site:`, url);
          log(`[Tab ${tabId}] ⏳ Starting 15-second timer...`);
          
          // Clear the Easy Apply timeout since external navigation was detected
          if (easyApplyTimeoutId) {
            clearTimeout(easyApplyTimeoutId);
            log(`[Tab ${tabId}] 🚫 Cleared Easy Apply timeout - external site detected`);
            easyApplyTimeoutId = null;
          }
          
          // Capture the job ID to use in the setTimeout callback
          const jobId = result.lastApplyJobId;
          
          // Mark that we've started the timer (prevent duplicates)
          chrome.storage.local.set({
            externalApplicationUrl: url,
            timerStarted: true,
            lastExternalUrl: url
          }, () => {
            log(`[Tab ${tabId}] Stored external URL and marked timer as started`);
          });
          
          // Set a 30-second timeout to clear the expectingExternalNavigation flag
          // This ensures the flag doesn't persist if user takes too long
          setTimeout(() => {
            chrome.storage.local.set({ expectingExternalNavigation: false });
            log(`[Tab ${tabId}] 🕐 30-second timeout elapsed - cleared expectingExternalNavigation flag`);
          }, 30000);
          // Start timer
          setTimeout(() => {
            log(`[Tab ${tabId}] ⏰ 15 seconds elapsed - injecting modal into external site`);
            log(`[Tab ${tabId}] 🌐 External Application URL:`, url);
            
            // Clear the expectingExternalNavigation flag since we found the external site
            chrome.storage.local.set({ expectingExternalNavigation: false });
            
            // Inject the external sites handler script into the current tab
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['external-sites-handler.js']
            }, () => {
              if (chrome.runtime.lastError) {
                log(`[Tab ${tabId}] ❌ Error injecting script:`, chrome.runtime.lastError);
              } else {
                log(`[Tab ${tabId}] ✅ Script injected successfully`);
                
                // Send message to show the modal
                chrome.tabs.sendMessage(tabId, {
                  type: 'SHOW_APPLICATION_MODAL',
                  data: {
                    jobId: jobId,
                    externalUrl: url
                  }
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    log(`[Tab ${tabId}] ⚠️ Error sending modal message:`, chrome.runtime.lastError);
                  } else {
                    log(`[Tab ${tabId}] ✅ Modal message sent`, response);
                  }
                });
              }
            });
          }, 15000); // 15 seconds for testing
        } else {
          log(`[Tab ${tabId}] ⚠️ No stored apply job ID or timer already started for this URL - ignoring external navigation`);
        }
      });
    }
  }
});

// Handle messages from content script and external sites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RECORD_APPLICATION_STATUS') {
    const { jobId, status, externalUrl } = request.data;
    log(`Popup response: ${status} for job ${jobId}`);
    recordApplicationStatus(jobId, status, externalUrl);
    sendResponse({ status: 'recorded' });
  } else if (request.type === 'START_EASY_APPLY_TIMEOUT') {
    // Start 10-second timeout for Easy Apply detection
    const jobId = request.data.jobId;
    
    // Clear any existing Easy Apply timeout
    if (easyApplyTimeoutId) {
      clearTimeout(easyApplyTimeoutId);
    }
    
    log(`Starting 10-second Easy Apply timeout for job ${jobId}`);
    
    easyApplyTimeoutId = setTimeout(() => {
      log(`⏰ 10 seconds elapsed - no external navigation detected, triggering Easy Apply modal`);
      
      // Get the current tab to inject modal
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tabId = tabs[0].id;
          log(`Injecting Easy Apply modal into tab ${tabId}`);
          
          // Send message to contentScript to show Easy Apply modal
          chrome.tabs.sendMessage(tabId, {
            type: 'SHOW_EASY_APPLY_MODAL',
            data: { jobId: jobId }
          }, (response) => {
            if (chrome.runtime.lastError) {
              log(`⚠️ Error sending Easy Apply modal message:`, chrome.runtime.lastError);
            } else {
              log(`✅ Easy Apply modal message sent`, response);
            }
          });
          
          // Clear expectingExternalNavigation since we're showing the modal
          chrome.storage.local.set({ expectingExternalNavigation: false });
        }
      });
      
      easyApplyTimeoutId = null;
    }, 10000); // 10 seconds
    
    sendResponse({ status: 'timeout_started' });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log(`Message received from ${sender.url}:`, request.type);
  
  if (request.type === "PAGE_STATUS") {
    // Store current page status
    chrome.storage.local.set({ currentPageStatus: request.data });
    sendResponse({ status: "status_received" });
  } else if (request.type === "JOB_PAGE_VIEW") {
    handleJobPageView(request.data, sender.url, request.timestamp);
    sendResponse({ status: "recorded" });
  } else if (request.type === "USER_ACTION") {
    handleUserAction(request.data, sender.url, request.timestamp);
    sendResponse({ status: "recorded" });
  }
});

/**
 * Handle job posting page view event
 */
function handleJobPageView(jobDetails, pageUrl, timestamp) {
  const event = {
    type: "JOB_VIEW",
    jobId: jobDetails.jobId,
    title: jobDetails.title,
    company: jobDetails.company,
    location: jobDetails.location,
    pageUrl: pageUrl,
    timestamp: timestamp,
    sessionId: null // Will be tracked for session analysis
  };
  
  log("Recording JOB_VIEW event:", event);
  
  // Store the event
  chrome.storage.local.get(["events"], (res) => {
    const events = res.events || [];
    events.push(event);
    chrome.storage.local.set({ events });
    log(`Total events stored: ${events.length}`);
  });
  
  // Also store job posting details for future reference
  if (jobDetails.jobId) {
    chrome.storage.local.get(["jobPostings"], (res) => {
      const postings = res.jobPostings || {};
      postings[jobDetails.jobId] = {
        ...jobDetails,
        firstViewedAt: timestamp,
        viewCount: (postings[jobDetails.jobId]?.viewCount || 0) + 1
      };
      chrome.storage.local.set({ jobPostings: postings });
    });
  }
}

/**
 * Handle user actions (save, apply, skip, etc.)
 */
function handleUserAction(actionData, pageUrl, timestamp) {
  const event = {
    type: actionData.action, // "APPLIED", "SAVED", "SKIPPED", "SCROLL"
    jobId: actionData.jobId,
    pageUrl: pageUrl,
    timestamp: timestamp,
    metadata: actionData.metadata || {}
  };
  
  log(`Recording ${actionData.action} event:`, event);
  
  chrome.storage.local.get(["events"], (res) => {
    const events = res.events || [];
    events.push(event);
    chrome.storage.local.set({ events });
  });
}

/**
 * Record application status from external site confirmation
 */
function recordApplicationStatus(jobId, status, externalUrl) {
  const event = {
    type: status, // "APPLIED" or "SKIPPED"
    jobId: jobId,
    pageUrl: externalUrl || 'external_application_site',
    timestamp: Date.now(),
    metadata: {
      source: externalUrl === 'easy_apply_on_linkedin' ? 'easy_apply_modal' : 'external_confirmation_modal',
      externalApplicationUrl: externalUrl
    }
  };
  
  log(`Recording application status: ${status} for job ${jobId} on external site: ${externalUrl}`, event);
  
  // Clear Easy Apply timeout if it's still running
  if (easyApplyTimeoutId) {
    clearTimeout(easyApplyTimeoutId);
    easyApplyTimeoutId = null;
    log(`Cleared Easy Apply timeout`);
  }
  
  chrome.storage.local.get(["events"], (res) => {
    const events = res.events || [];
    events.push(event);
    chrome.storage.local.set({ 
      events,
      // Reset the timer flag and expectation so future applications work
      timerStarted: false,
      lastApplyJobId: null,
      lastApplyTimestamp: null,
      expectingExternalNavigation: false
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PING") sendResponse("PONG");
});
