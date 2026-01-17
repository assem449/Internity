// src/services/transformers.ts

export const deriveAnalytics = (events: any[], jobPostings: Record<string, any>) => {
  return {
    eventCount: events.length,
    jobViewCount: events.filter(e => e.type === "JOB_VIEW").length,
    uniqueJobs: Object.keys(jobPostings).length
  };
};

export const getRecentEvents = (events: any[]) =>
  [...events].slice(-8).reverse();

export const getTrackedJobs = (jobPostings: Record<string, any>) =>
  Object.values(jobPostings).slice(-5).reverse();
