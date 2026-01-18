// src/components/RecentView.tsx
import { Internship } from "./Internship";
import type { InternshipSuggestion } from "./Suggestions";

export interface RecentViewProps {
    className?: string;
    data: InternshipSuggestion[];
}

export const RecentView = ({ className = "", data }: RecentViewProps) => {
    // Prevent crash if no jobs have been viewed yet
    if (!data || data.length === 0) {
        return (
            <div className={`p-4 bg-DYNAMIC-TERT rounded-[5px] border border-DYNAMIC-PRIMARY ${className}`}>
                <div className="font-sans italic text-DYNAMIC-PRIMARY text-sm">RECENT JOB VIEWED</div>
                <p className="text-xs text-DYNAMIC-PRIMARY opacity-60 mt-2">No jobs viewed yet.</p>
            </div>
        );
    }

    // data[0] is the most recent because getTrackedJobs() uses .reverse()
    const latestJob = data[0];

    return (
        <div className={`flex flex-col gap-2 p-4 w-full max-w-[383px] bg-DYNAMIC-TERT rounded-[5px] border border-solid border-DYNAMIC-PRIMARY shadow-[0_4px_4px_#8d90a29e] ${className}`}>
            <div className="font-sans italic text-DYNAMIC-PRIMARY text-sm leading-normal">
                RECENT JOB VIEWED
            </div>

            <Internship
                key={latestJob.id}
                data={latestJob}
                className="w-full" 
            />
        </div>
    );
};