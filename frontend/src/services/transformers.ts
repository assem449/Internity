// src/services/transformers.ts

import type { InternshipSuggestion } from "../components/Suggestions";

export const deriveAnalytics = (events: any[], jobPostings: Record<string, any>) => {
  return {
    eventCount: events.length,
    jobViewCount: events.filter(e => e.type === "JOB_VIEW").length,
    uniqueJobs: Object.keys(jobPostings).length
  };
};

export const getRecentEvents = (events: any[]) =>
  [...events].slice(-8).reverse();

// export const getTrackedJobs = (jobPostings: Record<string, any>) =>
//   Object.values(jobPostings).slice(-5).reverse();

// src/services/transformers.ts

export const mapJobToRecentJobs = (job: any): any => ({
  id: job.jobId || Math.random().toString(),
  role: job.title || "Unknown Role",
  company: job.company || "Unknown Company",
  logoUrl: job.logoUrl || "", // You might need to scrape this later
  skillTags: job.skills || ["LinkedIn", "Tracked"], // Fallback tags
});

// src/services/transformers.ts

export const mapJobToSuggestion = (job: any): InternshipSuggestion => ({
  id: job.jobId || Math.random().toString(),
  company: job.company || "Unknown Company",
  role: job.title || "Job Posting",
  location: job.location || "Remote",
  skillTags: job.skills || ["Internship", "Tech"],
  salary: job.salary || "N/A",
  logoUrl: job.logoUrl 
});

export const getTrackedJobs = (jobPostings: Record<string, any>) =>
  Object.values(jobPostings)
    .slice(-5)
    .reverse()
    .map(mapJobToSuggestion); // Convert raw storage data to UI-friendly props