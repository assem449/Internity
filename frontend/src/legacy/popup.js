/**
 * Internity Popup - Display tracked events and statistics
 */

const eventCount = document.getElementById("eventCount");
const jobViewCount = document.getElementById("jobViewCount");
const uniqueJobCount = document.getElementById("uniqueJobCount");
const recentEvents = document.getElementById("recentEvents");
const jobsList = document.getElementById("jobsList");
const clearBtn = document.getElementById("clear");

// Add status indicator
const statusDiv = document.createElement("div");
statusDiv.id = "page-status";
statusDiv.style.cssText = `
  padding: 12px;
  margin-bottom: 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  display: none;
  align-items: center;
  gap: 8px;
`;
document.querySelector(".container").insertBefore(statusDiv, document.querySelector(".stats"));

// Add application status indicator
const appStatusDiv = document.createElement("div");
appStatusDiv.id = "app-status";
appStatusDiv.style.cssText = `
  padding: 12px;
  margin-bottom: 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  display: none;
  align-items: center;
  gap: 8px;
  background: #e7f3ff;
  color: #0a66c2;
  border-left: 4px solid #0a66c2;
`;
document.querySelector(".container").insertBefore(appStatusDiv, document.querySelector(".stats"));

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function updatePageStatus() {
  chrome.storage.local.get(["currentPageStatus", "events"], (res) => {
    const status = res.currentPageStatus;
    const events = res.events || [];
    
    if (status && status.onJobsPage) {
      if (status.onJobDetail) {
        statusDiv.style.display = "flex";
        statusDiv.style.background = "#e7f3ff";
        statusDiv.style.color = "#0a66c2";
        statusDiv.style.borderLeft = "4px solid #0a66c2";
        statusDiv.innerHTML = '🎯 <span>Currently viewing a job posting</span>';
        
        // Check if applied to this job
        if (status.currentJobId) {
          const hasApplied = events.some(e => 
            e.type === "APPLIED" && e.jobId === status.currentJobId
          );
          
          if (hasApplied) {
            appStatusDiv.style.display = "flex";
            appStatusDiv.innerHTML = '✅ <span>You have applied to this job</span>';
          } else {
            appStatusDiv.style.display = "none";
          }
        } else {
          appStatusDiv.style.display = "none";
        }
      } else {
        statusDiv.style.display = "flex";
        statusDiv.style.background = "#f0f0f0";
        statusDiv.style.color = "#666";
        statusDiv.style.borderLeft = "4px solid #999";
        statusDiv.innerHTML = '📋 <span>On LinkedIn Jobs page</span>';
        appStatusDiv.style.display = "none";
      }
    } else {
      statusDiv.style.display = "none";
      appStatusDiv.style.display = "none";
    }
  });
}

function render() {
  chrome.storage.local.get(["events", "jobPostings"], (res) => {
    const events = res.events || [];
    const jobPostings = res.jobPostings || {};
    
    // Update stats
    eventCount.textContent = events.length;
    
    const jobViews = events.filter(e => e.type === "JOB_VIEW").length;
    jobViewCount.textContent = jobViews;
    uniqueJobCount.textContent = Object.keys(jobPostings).length;
    
    // Show recent events (last 8)
    const recent = events.slice(-8).reverse();
    if (recent.length === 0) {
      recentEvents.innerHTML = '<p class="empty">No events recorded yet</p>';
    } else {
      recentEvents.innerHTML = recent
        .map((event) => {
          let icon = "📍";
          let label = event.type;
          
          if (event.type === "JOB_VIEW") {
            icon = "👁️";
            label = `Viewed: ${event.title || "Job"}`;
          } else if (event.type === "APPLIED") {
            icon = "✅";
            label = "Applied";
          } else if (event.type === "SAVED") {
            icon = "❤️";
            label = "Saved";
          } else if (event.type === "SKIPPED") {
            icon = "⏭️";
            label = "Skipped";
          }
          
          return `
            <div class="event-item">
              <span class="event-icon">${icon}</span>
              <div class="event-details">
                <div class="event-label">${label}</div>
                <div class="event-company">${event.company || event.location || "LinkedIn"}</div>
                <div class="event-time">${formatTime(event.timestamp)}</div>
              </div>
            </div>
          `;
        })
        .join("");
    }
    
    // Show tracked jobs
    const jobArray = Object.values(jobPostings);
    if (jobArray.length === 0) {
      jobsList.innerHTML = '<p class="empty">No jobs tracked yet</p>';
    } else {
      jobsList.innerHTML = jobArray
        .slice(-5)
        .reverse()
        .map((job) => {
          return `
            <div class="job-item">
              <div class="job-title">${job.title || "Job Posting"}</div>
              <div class="job-company">${job.company || "Unknown Company"}</div>
              <div class="job-meta">
                <span>${job.location || "Location TBD"}</span>
                <span class="view-count">Views: ${job.viewCount || 1}</span>
              </div>
            </div>
          `;
        })
        .join("");
    }
    
    // Update page status
    updatePageStatus();
  });
}

clearBtn.addEventListener("click", () => {
  if (confirm("Clear all tracked events and data?")) {
    chrome.storage.local.set(
      {
        events: [],
        jobPostings: {},
        sessionStarted: Date.now()
      },
      () => {
        render();
      }
    );
  }
});

// Add test button to verify extension works
function addTestButton() {
  const testBtn = document.createElement("button");
  testBtn.id = "test-btn";
  testBtn.textContent = "🧪 Test Event";
  testBtn.style.cssText = `
    width: 100%;
    padding: 8px;
    margin-top: 8px;
    background: #0a66c2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 8px;
  `;
  
  testBtn.addEventListener("click", () => {
    const testJob = {
      jobId: "test-" + Date.now(),
      title: "Senior Product Manager - Internships",
      company: "TechCorp Inc.",
      location: "Remote",
      salary: "$80K - $120K",
      seniority: "Senior"
    };
    
    // Record test event
    chrome.storage.local.get(["events", "jobPostings"], (res) => {
      const events = res.events || [];
      const jobPostings = res.jobPostings || {};
      
      // Add test view event
      events.push({
        type: "JOB_VIEW",
        jobId: testJob.jobId,
        title: testJob.title,
        company: testJob.company,
        location: testJob.location,
        pageUrl: "https://www.linkedin.com/jobs/test",
        timestamp: Date.now()
      });
      
      // Add test job to postings
      jobPostings[testJob.jobId] = {
        ...testJob,
        firstViewedAt: Date.now(),
        viewCount: 1
      };
      
      chrome.storage.local.set({ events, jobPostings }, () => {
        console.log("✓ Test event recorded");
        render();
      });
    });
  });
  
  clearBtn.parentNode.insertBefore(testBtn, clearBtn);
}

// Initial render
render();
addTestButton();

// Refresh stats every 2 seconds
setInterval(render, 2000);
