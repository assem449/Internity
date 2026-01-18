import { useEffect, useState } from "react";
import { getPopupData } from "../services/storage";
import { deriveAnalytics, getRecentEvents, getTrackedJobs } from "../services/transformers";
import { Analytics } from "../components/Analytics";
// import { CareerTrajectory } from "../components/CareerTrajectory";
import { Header } from "../components/Header";
import { Suggestions } from "../components/Suggestions";
import { RecentView } from "../components/RecentView";

export const PopupApp = () => {
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    const { events, jobPostings, currentPageStatus } = await getPopupData();
    
    // Check if user has applied to the current job (Legacy logic)
    const hasApplied = currentPageStatus?.currentJobId 
      ? events.some(e => e.type === "APPLIED" && e.jobId === currentPageStatus.currentJobId)
      : false;

    setData({
      analytics: deriveAnalytics(events, jobPostings),
      recentEvents: getRecentEvents(events),
      trackedJobs: getTrackedJobs(jobPostings),
      pageStatus: currentPageStatus,
      hasApplied: hasApplied
    });
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 2000); 
    return () => clearInterval(id);
  }, []);

  // Handle Clear Data (Legacy logic)
  const handleClearData = () => {
    if (confirm("Clear all tracked events and data?")) {
      chrome.storage.local.set({ events: [], jobPostings: {} }, () => fetchData());
    }
  };

  if (!data) return <div className="p-10 text-white">Loading Internity...</div>;

  return (
    <div className="w-[430px] min-h-[632px] bg-slate-900/60 blurred-bg text-white flex flex-col items-center">
      <div className="flex flex-col w-full px-6 py-7 gap-6">
        <Header />

        {/* Status Indicators (Ported from legacy) */}
        {data.pageStatus?.onJobDetail && (
          <div className={`p-3 rounded-lg text-sm border-l-4 ${data.hasApplied ? 'bg-green-900/30 border-green-500' : 'bg-blue-900/30 border-blue-500'}`}>
            {data.hasApplied ? "✅ Already applied to this job" : "🎯 Viewing a job posting"}
          </div>
        )}

        <Analytics data={data.analytics} />
        {/* <CareerTrajectory data={data.recentEvents} />  */}
        <RecentView data={data.trackedJobs} />
        <Suggestions data={data.trackedJobs} /> {/* Will eventually switch to a result of an api call or sth */}

        <button 
          onClick={handleClearData}
          className="mt-4 text-xs text-gray-400 hover:text-red-400 transition-colors self-center"
        >
          🗑️ Clear Local Data
        </button>
      </div>
    </div>
  );
};