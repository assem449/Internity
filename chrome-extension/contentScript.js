/**
 * Internity - Behavior-Driven Internship Recommendation System
 * Content Script: Detects LinkedIn job postings and captures user behavior
 */

const DEBUG = true;
const log = (msg, data) => {
  if (DEBUG) console.log(`[Internity] ${msg}`, data || "");
};

// Global variables for tracking state
let jobViewTimeout = null; // Timer for delaying job view logging
let currentJobStartTime = null; // When did the user first land on this job? (saves timestamp like 1705549200000)
let currentJobId = null; // What job are we currently looking at? (saves job ID like "12345")

let scrollDepthTracker = null;
let scrollContainerEl = null;
let maxScrollDepth = 0;
let scrollMilestones = { 25: false, 50: false, 70: false, 90: false, 100: false };

function findRealScroller(startEl) {
  const descendants = Array.from(startEl.querySelectorAll("div"));
  for (const el of [startEl, ...descendants]) {
    const s = getComputedStyle(el);
    if ((s.overflowY === "auto" || s.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 150 &&
        el.clientHeight > 200) {
      return el;
    }
  }
  let el = startEl;
  while (el && el !== document.body) {
    const s = getComputedStyle(el);
    if ((s.overflowY === "auto" || s.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 150) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function setupScrollDepthTracking(jobId) {
  log("🔍 setupScrollDepthTracking called for job:", jobId);

  // Remove old listener from the exact element we used before
  if (scrollDepthTracker && scrollContainerEl) {
    scrollContainerEl.removeEventListener("scroll", scrollDepthTracker);
    log("🗑️ Removed old scroll listener");
  }
  scrollContainerEl = null;

  // Reset per-job state
  maxScrollDepth = 0;
  scrollMilestones = { 25: false, 50: false, 70: false, 90: false, 100: false };

  const selectors = [
    ".jobs-details__main-content",
    ".scaffold-layout__detail",
    ".jobs-search__job-details--container",
  ];

  let container = null;
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      container = el;
      log("✅ Found container with selector:", selector);
      break;
    }
  }

  if (!container) {
    log("⚠️ Could not find job details container. Retrying...");
    setTimeout(() => setupScrollDepthTracking(jobId), 800);
    return;
  }

  // Resolve the actual scrollable element
  const realScroller = findRealScroller(container);
  if (!realScroller) {
    log("⚠️ Found container but not scrollable yet. Retrying...");
    setTimeout(() => setupScrollDepthTracking(jobId), 800);
    return;
  }

  scrollContainerEl = realScroller;

  // If still not scrollable, retry
  const scrollableHeight = scrollContainerEl.scrollHeight - scrollContainerEl.clientHeight;
  if (scrollableHeight <= 50) {
    log("⚠️ Scroller not ready (no scrollable height). Retrying...");
    setTimeout(() => setupScrollDepthTracking(jobId), 800);
    return;
  }

  log("📦 Using scroller:", scrollContainerEl);
  log("📏 scrollHeight:", scrollContainerEl.scrollHeight, "clientHeight:", scrollContainerEl.clientHeight);

  scrollDepthTracker = () => {
    const el = scrollContainerEl;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;

    const pct = Math.round((el.scrollTop / max) * 100);

    if (pct > maxScrollDepth) {
      maxScrollDepth = pct;
      log(`📊 Scroll depth: ${pct}% (max: ${maxScrollDepth}%)`);
    }

    [25, 50, 70, 90, 100].forEach((m) => {
      if (maxScrollDepth >= m && !scrollMilestones[m]) {
        scrollMilestones[m] = true;
        log(`🎯 MILESTONE REACHED: ${m}%`);

        chrome.runtime.sendMessage({
          type: "SCROLL_MILESTONE",
          data: {
            jobId,
            milestone: m,
            timestamp: Date.now(),
            maxScrollDepth,
          },
        });
      }
    });
  };

  scrollContainerEl.addEventListener("scroll", scrollDepthTracker, { passive: true });
  log("✓ Scroll depth tracking active");
}


/**
 * Get current scroll depth data for a job
 */
function getScrollDepthData() {
  return {
    maxScrollDepth: maxScrollDepth,
    milestonesReached: Object.keys(scrollMilestones).filter(k => scrollMilestones[k]).map(Number)
  };
}

// Detect if we're on a LinkedIn job posting page
function detectJobPostingPage() {
  const url = location.href;
  
  // LinkedIn job URL patterns
  const jobViewPattern = /\/jobs\/view\/\d+/;
  const currentJobIdPattern = /currentJobId=(\d+)/;
  const jobSearchPattern = /\/jobs\/search/;
  const jobCollectionsPattern = /\/jobs\/collections/;
  const jobsPagePattern = /\/jobs\/?$/;
  
  const isJobView = jobViewPattern.test(url);
  const hasCurrentJobId = currentJobIdPattern.test(url);
  const isJobSearch = jobSearchPattern.test(url);
  const isJobCollections = jobCollectionsPattern.test(url);
  const isJobsPage = jobsPagePattern.test(url);
  
  const isJobDetail = isJobView || hasCurrentJobId;
  
  return {
    isLinkedInJobs: isJobView || isJobSearch || isJobCollections || isJobsPage || hasCurrentJobId,
    isJobDetail: isJobDetail,
    isJobSearch: isJobSearch,
    isJobCollections: isJobCollections,
    isJobsList: isJobsPage,
    hasCurrentJobId: hasCurrentJobId,
    url: url
  };
}

// Extract job posting details from the page
function extractJobPostingDetails() {
  const details = {
    title: null,
    company: null,
    jobId: null,
    salary: null,
    location: null,
    seniority: null,
    skills: []
  };
  
  const url = location.href;
  
  // Extract Job ID from URL
  let jobIdMatch = url.match(/\/jobs\/view\/(\d+)/);
  if (jobIdMatch) {
    details.jobId = jobIdMatch[1];
  } else {
    jobIdMatch = url.match(/currentJobId=(\d+)/);
    if (jobIdMatch) {
      details.jobId = jobIdMatch[1];
    }
  }
  
  log("Extraction attempt - JobId:", details.jobId);
  
  // Find the job details container (LinkedIn uses different selectors)
  const jobContainer = document.querySelector('[data-job-details-container]') || 
                       document.querySelector('.jobs-search__job-details-container') ||
                       document.querySelector('.job-view-layout') ||
                       document.querySelector('.scaffold-layout__detail') ||
                       document;
  
  // Only extract if we have a valid container
  const hasValidContainer = jobContainer !== document;
  
  if (!hasValidContainer) {
    log("⏳ Job details container not ready yet");
    return details;
  }
  
  // Job title selectors - look for the main heading in the job details
  let titleEl = jobContainer.querySelector('h2[data-test-id*="job-title"]');
  if (!titleEl) titleEl = jobContainer.querySelector('h1');
  if (!titleEl) {
    // Look for h2/h3 that's not in a navigation or notification area
    const headings = Array.from(jobContainer.querySelectorAll('h2, h3')).filter(h => {
      const text = h.textContent?.trim();
      return text && !text.includes('notification') && !text.match(/^\d+$/) && text.length > 5;
    });
    if (headings.length > 0) titleEl = headings[0];
  }
  
  // Company selectors - try multiple strategies
  let companyEl = null;
  
  // Strategy 1: Look for company link
  const companyLink = Array.from(jobContainer.querySelectorAll('a')).find(a => {
    const href = a.href || '';
    const text = a.textContent?.trim();
    return href.includes('/company/') && text && text.length > 1 && text.length < 100;
  });
  if (companyLink) companyEl = companyLink;
  
  // Strategy 2: Look for text that appears to be a company name
  // Company names are typically 2-50 characters, don't contain special keywords
  if (!companyEl) {
    const allElements = Array.from(jobContainer.querySelectorAll('div, span, a')).filter(el => {
      const text = el.textContent?.trim();
      return text && 
             text.length > 2 && 
             text.length < 80 &&
             !text.match(/^\d+/) &&
             !text.includes('Apply') &&
             !text.includes('Followers') &&
             !text.includes('Save') &&
             !text.includes('message') &&
             el.children.length === 0; // Leaf nodes only
    });
    
    // Filter for likely company names
    const likelyCompanies = allElements.filter(el => {
      const text = el.textContent?.trim();
      return text && !text.match(/^[a-z]/); // Start with capital letter
    });
    
    if (likelyCompanies.length > 0) {
      companyEl = likelyCompanies[0];
    }
  }
  
  // Location selectors
  let locationEl = null;
  
  // Try to find location in common patterns
  const locSelectors = [
    'span.job-details-jobs-unified-top-card__location',
    '[data-test-id*="location"]',
    'span[data-test-id*="job-details-location"]'
  ];
  
  for (const selector of locSelectors) {
    locationEl = jobContainer.querySelector(selector);
    if (locationEl) break;
  }
  
  // Fallback: search through text content for location patterns
  if (!locationEl) {
    const textElements = Array.from(jobContainer.querySelectorAll('span, div')).filter(el => {
      const text = el.textContent?.trim();
      return text && text.length < 50 && text.length > 2;
    });
    
    locationEl = textElements.find(el => {
      const text = el.textContent?.trim();
      return text && /^[\w\s]+,\s*[\w\s]+$/.test(text) || text === 'Remote' || text.includes('On-site');
    });
  }
  
  if (titleEl) {
    const title = titleEl.textContent?.trim();
    if (title && !title.includes('notification') && !title.match(/^\d+$/) && title.length > 5) {
      details.title = title;
    }
  }
  if (companyEl) {
    const company = companyEl.textContent?.trim();
    // Filter out empty or very short text
    if (company && company.length > 1 && !company.match(/^[\d\s]*$/) && company !== 'LinkedIn') {
      details.company = company;
    }
  }
  if (locationEl) {
    const location = locationEl.textContent?.trim();
    if (location && location.length > 1) {
      details.location = location;
    }
  }
  
  log("Extraction attempt - Title:", details.title, "Company:", details.company, "Location:", details.location);
  
  return details;
}

// Initialize page detection
const pageInfo = detectJobPostingPage();
log("Page Detection:", pageInfo);

if (pageInfo.isLinkedInJobs) {
  log("✓ LinkedIn Jobs page detected!");
  
  // Immediately notify popup that we're on a jobs page
  chrome.runtime.sendMessage(
    {
      type: "PAGE_STATUS",
      data: {
        onJobsPage: true,
        onJobDetail: pageInfo.isJobDetail,
        url: pageInfo.url
      }
    },
    (response) => {
      if (chrome.runtime.lastError) {
        log("Note: Could not send status (popup may not be open)");
      }
    }
  );
}

// Track Apply button clicks
function setupApplyButtonTracking() {
  const applyButtonSelectors = [
    'button[aria-label*="Easy Apply"]',
    'button[aria-label*="Apply"]',
    'button.jobs-apply-button',
    '[data-live-test-job-apply-button]'
  ];
  
  let applyButton = null;
  
  for (const selector of applyButtonSelectors) {
    applyButton = document.querySelector(selector);
    if (applyButton) {
      log("✓ Found apply button with selector:", selector);
      break;
    }
  }
  
  if (!applyButton) {
    log("⚠️ Could not find Apply button - will retry in 1000ms");
    setTimeout(() => {
      setupApplyButtonTracking();
    }, 1000);
    return;
  }
  
  if (applyButton && !applyButton.hasListener) {
    applyButton.hasListener = true;
    
    applyButton.addEventListener('click', () => {
      const url = location.href;
      const jobIdMatch = url.match(/\/jobs\/view\/(\d+)/) || url.match(/currentJobId=(\d+)/);
      const jobId = jobIdMatch ? jobIdMatch[1] : null;
      
      if (jobId) {
        log("✅ Apply button clicked for job:", jobId);
        log("👁️ User heading to external application page - timer will continue from when they first viewed the job");
        
        // Store job ID and timestamp for tracking
        // Use currentJobStartTime for total time tracking (LinkedIn + external site)
        chrome.storage.local.set({
          lastApplyJobId: jobId,
          lastApplyTimestamp: currentJobStartTime || Date.now(),
          lastApplyUrl: url,
          expectingExternalNavigation: true
        });
        
        // Notify background to start Easy Apply timeout
        chrome.runtime.sendMessage(
          {
            type: "START_EASY_APPLY_TIMEOUT",
            data: { jobId: jobId }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              log("⚠️ Error starting Easy Apply timeout:", chrome.runtime.lastError);
            } else {
              log("✓ Easy Apply timeout started");
            }
          }
        );
      } else {
        log("⚠️ Could not extract job ID from URL");
      }
    });
    
    log("✓ Apply button tracking initialized");
  }
}

setupApplyButtonTracking();

// Monitor for new apply buttons (LinkedIn loads content dynamically)
const setupApplyButtonObserver = () => {
  const observer = new MutationObserver(() => {
    setupApplyButtonTracking();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label', 'data-test-id']
  });
};

setupApplyButtonObserver();

// Initialize job view logging on initial page load
if (pageInfo.isJobDetail) {
  log("⏳ Initial load is job detail page - scheduling 15-second job view timer...");
  
  // Extract job ID and start the stopwatch for this job
  const jobIdMatch = pageInfo.url.match(/\/jobs\/view\/(\d+)/) || pageInfo.url.match(/currentJobId=(\d+)/);
  if (jobIdMatch) {
    currentJobId = jobIdMatch[1]; // Save which job we're looking at
    currentJobStartTime = Date.now(); // Press START on the stopwatch (saves current time in milliseconds)
    log("⏱️ Started tracking job:", currentJobId, "at", new Date(currentJobStartTime).toLocaleTimeString());
    
    // Setup scroll depth tracking for this job
    setTimeout(() => setupScrollDepthTracking(currentJobId), 1500);
  }
  
  jobViewTimeout = setTimeout(() => {
    log("✓ 15 seconds elapsed - logging job view");
    
    const jobDetails = extractJobPostingDetails();
    log("Job Posting Details:", jobDetails);
    
    if (jobDetails.jobId && jobDetails.title) {
      // Include scroll depth data in job view event
      const scrollData = getScrollDepthData();
      
      chrome.runtime.sendMessage(
        {
          type: "JOB_PAGE_VIEW",
          data: {
            ...jobDetails,
            scrollDepth: scrollData.maxScrollDepth,
            scrollMilestones: scrollData.milestonesReached
          },
          timestamp: Date.now()
        },
        (response) => {
          if (chrome.runtime.lastError) {
            log("❌ Error sending message:", chrome.runtime.lastError);
          } else {
            log("✓ Job view logged after 10 seconds", response);
          }
        }
      );
    }
    jobViewTimeout = null;
  }, 15000);
}

// Monitor for URL changes (LinkedIn uses client-side routing)
let lastUrl = location.href;
let lastProcessedUrl = null;
let processingTimeout = null;

const checkUrlChange = () => {
  if (location.href !== lastUrl) {
    log("📍 URL changed:", location.href);
    lastUrl = location.href;
    
    // Clear any pending job view logging
    if (jobViewTimeout) {
      clearTimeout(jobViewTimeout);
      log("🚫 Cancelled pending job view (navigated away)");
    }
    
    // Debounce processing to avoid duplicate detections
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
    
    processingTimeout = setTimeout(() => {
      // Only process if we haven't already processed this exact URL
      if (lastProcessedUrl === location.href) {
        return;
      }
      lastProcessedUrl = location.href;
      
      // Re-run detection on new URL
      const pageInfo = detectJobPostingPage();
      log("Page Detection after navigation:", pageInfo);
      
      if (pageInfo.isLinkedInJobs) {
        log("✓ LinkedIn Jobs page detected!");
        
        // Extract job ID for status tracking
        let currentJobId = null;
        if (pageInfo.isJobDetail) {
          const jobIdMatch = lastProcessedUrl.match(/\/jobs\/view\/(\d+)/) || lastProcessedUrl.match(/currentJobId=(\d+)/);
          if (jobIdMatch) {
            currentJobId = jobIdMatch[1];
            // Press RESET and START on the stopwatch for this new job
            // This happens when you click a different job in the list
            currentJobStartTime = Date.now(); // Save the exact moment we opened this new job
            log("⏱️ Navigated to new job:", currentJobId);
            
            // Setup scroll depth tracking for this job
            setTimeout(() => setupScrollDepthTracking(currentJobId), 1500);
          }
        }
        
        // Immediately notify popup that we're on a jobs page
        chrome.runtime.sendMessage(
          {
            type: "PAGE_STATUS",
            data: {
              onJobsPage: true,
              onJobDetail: pageInfo.isJobDetail,
              currentJobId: currentJobId,
              url: pageInfo.url
            }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              log("Note: Could not send status (popup may not be open)");
            }
          }
        );
        
        if (pageInfo.isJobDetail) {
          // Re-setup Apply button tracking for this new job
          setTimeout(() => {
            log("✓ Setting up Apply button tracking for new job...");
            setupApplyButtonTracking();
          }, 1000);
          
          // Wait longer before logging job view to ensure container is loaded
          log("⏳ Waiting 10 seconds before logging job view...");
          
          jobViewTimeout = setTimeout(() => {
            log("✓ 10 seconds elapsed - logging job view");
            
            // Extract and log job view
            const jobDetails = extractJobPostingDetails();
            log("Job Posting Details:", jobDetails);
            
            if (jobDetails.jobId && jobDetails.title) {
              // Include scroll depth data in job view event
              const scrollData = getScrollDepthData();
              
              chrome.runtime.sendMessage(
                {
                  type: "JOB_PAGE_VIEW",
                  data: {
                    ...jobDetails,
                    scrollDepth: scrollData.maxScrollDepth,
                    scrollMilestones: scrollData.milestonesReached
                  },
                  timestamp: Date.now()
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    log("❌ Error sending message:", chrome.runtime.lastError);
                  } else {
                    log("✓ Job view logged after 15 seconds", response);
                  }
                }
              );
            }
            jobViewTimeout = null;
          }, 15000);
        }
      } else {
        log("❌ Not a LinkedIn Jobs page");
      }
    }, 300); // 300ms debounce to wait for page to stabilize
  }
};

// Check for URL changes every 500ms
setInterval(checkUrlChange, 500);

// Listen for messages from background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SHOW_EASY_APPLY_MODAL') {
    log('📱 Showing Easy Apply modal on LinkedIn');
    showEasyApplyConfirmationModal(request.data.jobId);
    sendResponse({ status: 'modal_shown' });
  }
});

function showEasyApplyConfirmationModal(jobId) {
  // Check if modal already exists
  if (document.getElementById('internity-easy-apply-modal')) {
    return;
  }
  
  // Create modal HTML
  const modalHTML = `
    <div id="internity-easy-apply-modal" style="
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
        width: 100%;
        max-width: 450px;
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">✓</div>
        <h1 style="color: #0a66c2; font-size: 24px; margin-bottom: 16px; font-weight: 600;">Application Confirmation</h1>
        <p style="color: #565959; font-size: 16px; margin-bottom: 32px; line-height: 1.5;">Are you still considering applying for this job?</p>
        
        <div style="display: flex; gap: 12px; flex-direction: column;">
          <button id="internity-easy-apply-yes-btn" style="
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
          
          <button id="internity-easy-apply-no-btn" style="
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
  const yesBtn = document.getElementById('internity-easy-apply-yes-btn');
  const noBtn = document.getElementById('internity-easy-apply-no-btn');
  
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
    log('✅ Easy Apply: User confirmed Yes');
    
    // Calculate how long they spent looking at this job
    // It's like checking the stopwatch: current time - start time = elapsed time
    const timeSpentMs = currentJobStartTime ? Date.now() - currentJobStartTime : null; // Time in milliseconds
    const timeSpentSeconds = timeSpentMs ? Math.round(timeSpentMs / 1000) : null; // Convert to seconds (divide by 1000)
    
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'APPLIED',
        externalUrl: 'easy_apply_on_linkedin',
        timeSpentSeconds: timeSpentSeconds // Send how many seconds they spent on this job
      }
    }, (response) => {
      log('Easy Apply response recorded:', response);
      removeEasyApplyModal();
    });
  });
  
  // Handle No button
  noBtn.addEventListener('click', () => {
    log('❌ Easy Apply: User confirmed No');
    
    // Same calculation: how long did they look before deciding "no"?
    const timeSpentMs = currentJobStartTime ? Date.now() - currentJobStartTime : null;
    const timeSpentSeconds = timeSpentMs ? Math.round(timeSpentMs / 1000) : null;
    
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'SKIPPED',
        externalUrl: 'easy_apply_on_linkedin',
        timeSpentSeconds: timeSpentSeconds
      }
    }, (response) => {
      log('Easy Apply response recorded:', response);
      removeEasyApplyModal();
    });
  });
  
  log('✓ Easy Apply modal created and listeners attached');
}

function removeEasyApplyModal() {
  const modal = document.getElementById('internity-easy-apply-modal');
  if (modal) {
    modal.remove();
    log('Easy Apply modal removed');
  }
}