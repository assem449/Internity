import { DUMMY_CAREER_TRAJECTORY, DUMMY_SUGGESTIONS } from "../shared/constants";
import { Analytics } from "../components/Analytics";
import { CareerTrajectory } from "../components/CareerTrajectory";
import { Header } from "../components/Header";
import { Suggestions } from "../components/Suggestions";
import { RecentView } from "../components/RecentView";

import { useEffect, useState } from "react";
import { getPopupData } from "../services/storage";
import { deriveAnalytics, getRecentEvents, getTrackedJobs } from "../services/transformers";

export interface PopupProps {
    className?: string;
}

chrome.runtime.sendMessage({ type: "PING" }, () => {
  if (chrome.runtime.lastError) {
    console.warn("Background unavailable:", chrome.runtime.lastError.message);
  }
});


export const PopupApp = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { events, jobPostings, currentPageStatus } = await getPopupData();
      setData({
        analytics: deriveAnalytics(events, jobPostings),
        recentEvents: getRecentEvents(events),
        trackedJobs: getTrackedJobs(jobPostings),
        pageStatus: currentPageStatus
      });
    };

    fetchData();
    const id = setInterval(fetchData, 2000); // match your legacy refresh
    return () => clearInterval(id);
  }, []);

  if (!data) return <div>Loading…</div>;

  return (
    <div className="w-[430px] min-h-[632px] bg-DYNAMIC-BACKGROUND flex flex-col px-6 py-7 gap-6">
        <Header />
        <Analytics data={data.analytics} />
        <CareerTrajectory data={DUMMY_CAREER_TRAJECTORY} /> {/* API CALL TO AI */}
        <RecentView data={data.recentEvents} />
        <Suggestions data={DUMMY_SUGGESTIONS} /> {/* Job list or API call or sth */}
    </div>
  );
};
