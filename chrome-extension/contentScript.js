/**
 * Internity - Behavior-Driven Internship Recommendation System
 * Content Script: Detects LinkedIn job postings and captures user behavior
 */

const DEBUG = true;
const log = (msg, data) => {
  if (DEBUG) console.log(`[Internity] ${msg}`, data || "");
};

// Detect if we're on a LinkedIn job posting page
function detectJobPostingPage() {
  const url = location.href;
  
  // LinkedIn job posting URL patterns:
  // https://www.linkedin.com/jobs/view/[ID]/
  // https://www.linkedin.com/jobs/search/?...
  // https://www.linkedin.com/jobs/collections/?currentJobId=[ID]
  // Any LinkedIn jobs page with currentJobId parameter
  // https://www.linkedin.com/jobs/
  
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
  
  // If we have a currentJobId, treat it as a job detail view
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

// Extract job posting details from the page and store them
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
  
  // Extract Job ID from URL - try both /jobs/view/[ID] and currentJobId parameter
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
  
  // Try to find the job details container first to limit our search
  const jobContainer = document.querySelector('[data-job-details-container]') || 
                       document.querySelector('.jobs-search__job-details-container') ||
                       document.querySelector('.job-view-layout') ||
                       document.querySelector('.scaffold-layout__detail') ||
                       document;
  
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
  // LinkedIn's apply button selectors
  const applyButtonSelectors = [
    'button[aria-label*="Easy Apply"]',
    'button[aria-label*="Apply"]',
    'button.jobs-apply-button',
    '[data-live-test-job-apply-button]'
  ];
  
  let applyButton = null;
  
  // Try each selector
  for (const selector of applyButtonSelectors) {
    applyButton = document.querySelector(selector);
    if (applyButton) {
      log("✓ Found apply button with selector:", selector);
      break;
    }
  }
  
  if (!applyButton) {
    log("⚠️ Could not find Apply button - will retry in 1000ms");
    // Retry after 1 second
    setTimeout(() => {
      setupApplyButtonTracking();
    }, 1000);
    return;
  }
  
  if (applyButton && !applyButton.hasListener) {
    applyButton.hasListener = true; // Flag to avoid duplicate listeners
    
    applyButton.addEventListener('click', () => {
      const url = location.href;
      const jobIdMatch = url.match(/\/jobs\/view\/(\d+)/) || url.match(/currentJobId=(\d+)/);
      const jobId = jobIdMatch ? jobIdMatch[1] : null;
      
      if (jobId) {
        log("✅ Apply button clicked for job:", jobId);
        log("👁️ User heading to external application page - timer will start there");
        
        // Store the job ID and timestamp in chrome storage
        // The background worker will monitor for navigation and start the timer
        chrome.storage.local.set({
          lastApplyJobId: jobId,
          lastApplyTimestamp: Date.now(),
          lastApplyUrl: url,
          expectingExternalNavigation: true
        });
        
        // Notify background to start Easy Apply timeout monitoring
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

// Call setup initially
setupApplyButtonTracking();

// Also monitor for new apply buttons (LinkedIn loads content dynamically)
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

// Monitor for URL changes (LinkedIn uses client-side routing)
let lastUrl = location.href;
let lastProcessedUrl = null;
let processingTimeout = null;
let jobViewTimeout = null; // Timer for delaying job view logging

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
          
          // Set up a timer to log job view after 25 seconds
          log("⏳ Waiting 10 seconds before logging job view...");
          
          jobViewTimeout = setTimeout(() => {
            log("✓ 10 seconds elapsed - logging job view");
            
            // Extract and log job view
            const jobDetails = extractJobPostingDetails();
            log("Job Posting Details:", jobDetails);
            
            if (jobDetails.jobId) {
              chrome.runtime.sendMessage(
                {
                  type: "JOB_PAGE_VIEW",
                  data: jobDetails,
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
          }, 10000); // 10 second delay
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
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'APPLIED',
        externalUrl: 'easy_apply_on_linkedin'
      }
    }, (response) => {
      log('Easy Apply response recorded:', response);
      removeEasyApplyModal();
    });
  });
  
  // Handle No button
  noBtn.addEventListener('click', () => {
    log('❌ Easy Apply: User confirmed No');
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: jobId,
        status: 'SKIPPED',
        externalUrl: 'easy_apply_on_linkedin'
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