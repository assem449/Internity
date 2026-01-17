// src/services/storage.ts
interface EventRecord {
  type: string;
  jobId?: string;
  title?: string;
  company?: string;
  location?: string;
  timestamp: number;
}

interface PopupData {
  events: EventRecord[];
  jobPostings: Record<string, any>;
  currentPageStatus: any;
}

const normalizeEvent = (e: any): EventRecord | null => {
  if (typeof e !== "object") return null;
  if (typeof e.type !== "string") return null;
  if (typeof e.timestamp !== "number") return null;
  
  return {
    type: e.type,
    jobId: typeof e.jobId === "string" ? e.jobId : undefined,
    title: typeof e.title === "string" ? e.title : undefined,
    company: typeof e.company === "string" ? e.company : undefined,
    location: typeof e.location === "string" ? e.location : undefined,
    timestamp: e.timestamp,
  };
};

export const getPopupData = (): Promise<{
  events: EventRecord[];
  jobPostings: Record<string, any>;
  currentPageStatus: any;
}> => {
  return new Promise(resolve => {
    chrome.storage.local.get(["events", "jobPostings", "currentPageStatus"], (res) => {
      const data: PopupData = {
        events: Array.isArray(res.events) ? res.events.map(normalizeEvent).filter(e => e !== null) : [],
        jobPostings: res.jobPostings || {},
        currentPageStatus: res.currentPageStatus || null,
      };

      resolve(data);
    });
  });
};

