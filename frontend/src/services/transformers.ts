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

export const mapJobToSuggestion = (job: any): InternshipSuggestion => ({
  id: job.jobId || Math.random().toString(),
  company: job.company || "Unknown Company",
  role: job.title || "Job Posting",
  location: job.location || "Remote",
  skillTags: job.skills || ["Internship", "Tech"],
  salary: job.salary || "N/A",
  logoUrl: job.logoUrl || "",
  // jobUrl: job.jobUrl || "", // not sure if url actually exists but adding for future use
});

export const getTrackedJobs = (jobPostings: Record<string, any>) =>
  Object.values(jobPostings)
    .slice(-5)
    .reverse()
    .map(mapJobToSuggestion); // Convert raw storage data to UI-friendly props