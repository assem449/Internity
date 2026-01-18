/**
 * Internity - Background Service Worker
 * Handles event aggregation and data persistence
 */

const DEBUG = true;
const log = (msg, data) => {
  if (DEBUG) console.log(`[Internity-BG] ${msg}`, data || "");
};

// Stores Easy Apply timeout - if user clicks Apply but stays on LinkedIn,
// we wait 10 seconds then show confirmation popup
let easyApplyTimeoutId = null;

// Initialize storage when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  log("Extension installed - initializing storage");
  chrome.storage.local.set({
    events: [],
    jobPostings: {},
    sessionStarted: Date.now(),
    externalAppTimer: null
  });
});

// Monitor tabs to detect when user navigates from LinkedIn to external job site
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = tab.url || changeInfo.url;
  
  if (url) {
    log(`[Tab ${tabId}] URL updated:`, url);
    
    // Ignore Chrome internal URLs and LinkedIn pages
    if (url.startsWith('chrome://') || url.startsWith('about:')) {
      log(`[Tab ${tabId}] Ignoring Chrome internal URL`);
      return;
    }
    
    if (url.includes('linkedin.com')) {
      log(`[Tab ${tabId}] Still on LinkedIn`);
      return;
    }
    
    // External site detected - user left LinkedIn after clicking Apply
    if (url.startsWith('http://') || url.startsWith('https://')) {
      log(`[Tab ${tabId}] 🌐 External URL detected:`, url);
      
      chrome.storage.local.get(['lastApplyJobId', 'lastApplyTimestamp', 'timerStarted', 'lastExternalUrl', 'expectingExternalNavigation'], (result) => {
        log(`[Tab ${tabId}] Storage check - lastApplyJobId:`, result.lastApplyJobId, 'expectingExternalNavigation:', result.expectingExternalNavigation);
        
        // Only proceed if we're waiting for external navigation (they just clicked Apply)
        if (!result.expectingExternalNavigation) {
          log(`[Tab ${tabId}] ⚠️ Not expecting external navigation - ignoring this navigation`);
          return;
        }
        
        const isNewUrl = result.lastExternalUrl !== url;
        
        if (result.lastApplyJobId && (!result.timerStarted || isNewUrl)) {
          log(`[Tab ${tabId}] ✅ Found stored apply job ID:`, result.lastApplyJobId);
          log(`[Tab ${tabId}] 🌐 User navigated to external site:`, url);
          log(`[Tab ${tabId}] ⏳ Starting 10-second timer...`);
          
          // Clear Easy Apply timeout - they left LinkedIn, so not using Easy Apply
          if (easyApplyTimeoutId) {
            clearTimeout(easyApplyTimeoutId);
            log(`[Tab ${tabId}] 🚫 Cleared Easy Apply timeout - external site detected`);
            easyApplyTimeoutId = null;
          }
          
          const jobId = result.lastApplyJobId;
          
          // Mark timer as started to prevent duplicates
          chrome.storage.local.set({
            externalApplicationUrl: url,
            timerStarted: true,
            lastExternalUrl: url
          }, () => {
            log(`[Tab ${tabId}] Stored external URL and marked timer as started`);
          });
          
          // Safety timeout - reset flag after 30 seconds if user takes too long
          setTimeout(() => {
            chrome.storage.local.set({ expectingExternalNavigation: false });
            log(`[Tab ${tabId}] 🕐 30-second timeout elapsed - cleared expectingExternalNavigation flag`);
          }, 30000);  // 30000 milliseconds = 30 seconds
          // Start timer - wait 15 seconds then show the confirmation popup
          // This gives user time to read the job description on the company website
          setTimeout(() => {
            log(`[Tab ${tabId}] ⏰ 15 seconds elapsed - injecting modal into external site`);
            log(`[Tab ${tabId}] 🌐 External Application URL:`, url);
            
            // Clear the expectingExternalNavigation flag since we found the external site
            // Turn off the "waiting for navigation" flag
            chrome.storage.local.set({ expectingExternalNavigation: false });
            
            // Inject the external sites handler script into the current tab
            // This is like sending a messenger to the company website to show our popup
            chrome.scripting.executeScript({
              target: { tabId: tabId },              // Which tab to inject into
              files: ['external-sites-handler.js']   // What code to inject
            }, () => {
              if (chrome.runtime.lastError) {
                log(`[Tab ${tabId}] ❌ Error injecting script:`, chrome.runtime.lastError);
              } else {
                log(`[Tab ${tabId}] ✅ Script injected successfully`);
                
                // Send message to show the modal
                // Now that our code is on the company website, tell it to show the popup
                chrome.tabs.sendMessage(tabId, {
                  type: 'SHOW_APPLICATION_MODAL',  // What action to take
                  data: {
                    jobId: jobId,                           // Which job they're applying to
                    externalUrl: url,                       // What company website they're on
                    startTimestamp: result.lastApplyTimestamp // When they first looked at the job (for time tracking)
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

// Handle messages from content scripts and external sites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RECORD_APPLICATION_STATUS') {
    const { jobId, status, externalUrl, timeSpentSeconds } = request.data;
    log(`Popup response: ${status} for job ${jobId}, time spent: ${timeSpentSeconds}s`);
    recordApplicationStatus(jobId, status, externalUrl, timeSpentSeconds);
    sendResponse({ status: 'recorded' });
  } else if (request.type === 'START_EASY_APPLY_TIMEOUT') {
    // Start 10-second timeout - if no external navigation, show Easy Apply modal
    const jobId = request.data.jobId;
    
    if (easyApplyTimeoutId) {
      clearTimeout(easyApplyTimeoutId);
    }
    
    log(`Starting 10-second Easy Apply timeout for job ${jobId}`);
    
    easyApplyTimeoutId = setTimeout(() => {
      log(`⏰ 10 seconds elapsed - no external navigation detected, triggering Easy Apply modal`);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tabId = tabs[0].id;
          log(`Injecting Easy Apply modal into tab ${tabId}`);
          
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
          
          chrome.storage.local.set({ expectingExternalNavigation: false });
        }
      });
      
      easyApplyTimeoutId = null;
    }, 15000);
    
    sendResponse({ status: 'timeout_started' });
  }
});

// Handle page status and job view messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log(`Message received from ${sender.url}:`, request.type);
  
  if (request.type === "PAGE_STATUS") {
    chrome.storage.local.set({ currentPageStatus: request.data });
    sendResponse({ status: "status_received" });
  } else if (request.type === "JOB_PAGE_VIEW") {
    handleJobPageView(request.data, sender.url, request.timestamp);
    sendResponse({ status: "recorded" });
  } else if (request.type === "USER_ACTION") {
    handleUserAction(request.data, sender.url, request.timestamp);
    sendResponse({ status: "recorded" });
  } else if (request.type === "SCROLL_MILESTONE") {
    handleScrollMilestone(request.data, sender.url);
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
    scrollDepth: jobDetails.scrollDepth || 0,
    scrollMilestones: jobDetails.scrollMilestones || [],
    pageUrl: pageUrl,
    timestamp: timestamp,
    sessionId: null
  };
  
  log("Recording JOB_VIEW event:", event);
  
  chrome.storage.local.get(["events"], (res) => {
    const events = res.events || [];
    events.push(event);
    chrome.storage.local.set({ events });
    log(`Total events stored: ${events.length}`);
  });
  
  // Also track this job in jobPostings dictionary with view count and scroll data
  if (jobDetails.jobId) {
    chrome.storage.local.get(["jobPostings"], (res) => {
      const postings = res.jobPostings || {};
      postings[jobDetails.jobId] = {
        ...jobDetails,
        firstViewedAt: timestamp,
        viewCount: (postings[jobDetails.jobId]?.viewCount || 0) + 1,
        scrollDepth: jobDetails.scrollDepth || 0,
        scrollMilestones: jobDetails.scrollMilestones || []
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
    type: actionData.action,
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
 * Record application status from Yes/No confirmation popup
 */
function recordApplicationStatus(jobId, status, externalUrl, timeSpentSeconds) {
  const event = {
    type: status,
    jobId: jobId,
    pageUrl: externalUrl || 'external_application_site',
    timestamp: Date.now(),
    timeSpentSeconds: timeSpentSeconds,
    metadata: {
      source: externalUrl === 'easy_apply_on_linkedin' ? 'easy_apply_modal' : 'external_confirmation_modal',
      externalApplicationUrl: externalUrl
    }
  };
  
  log(`Recording application status: ${status} for job ${jobId}, time spent: ${timeSpentSeconds}s`, event);
  
  if (easyApplyTimeoutId) {
    clearTimeout(easyApplyTimeoutId);
    easyApplyTimeoutId = null;
    log(`Cleared Easy Apply timeout`);
  }
  
  // Reset flags for next application
  chrome.storage.local.get(["events"], (res) => {
    const events = res.events || [];
    events.push(event);
    chrome.storage.local.set({ 
      events,
      timerStarted: false,
      lastApplyJobId: null,
      lastApplyTimestamp: null,
      expectingExternalNavigation: false
    });
  });
}

/**
 * Handle scroll milestone event
 * Tracks when users reach specific scroll depths (25%, 50%, 75%, 100%)
 */
function handleScrollMilestone(data, pageUrl) {
  const event = {
    type: "SCROLL_MILESTONE",
    jobId: data.jobId,
    milestone: data.milestone,
    maxScrollDepth: data.maxScrollDepth,
    pageUrl: pageUrl,
    timestamp: data.timestamp
  };
  
  log(`Recording scroll milestone: ${data.milestone}% for job ${data.jobId}`, event);
  
  chrome.storage.local.get(["events"], (res) => {
    const events = res.events || [];
    events.push(event);
    chrome.storage.local.set({ events });
  });
  
  // Update job posting with latest scroll data
  chrome.storage.local.get(["jobPostings"], (res) => {
    const postings = res.jobPostings || {};
    if (postings[data.jobId]) {
      postings[data.jobId].maxScrollDepth = data.maxScrollDepth;
      if (!postings[data.jobId].scrollMilestones) {
        postings[data.jobId].scrollMilestones = [];
      }
      if (!postings[data.jobId].scrollMilestones.includes(data.milestone)) {
        postings[data.jobId].scrollMilestones.push(data.milestone);
        postings[data.jobId].scrollMilestones.sort((a, b) => a - b);
      }
      chrome.storage.local.set({ jobPostings: postings });
    }
  });
}