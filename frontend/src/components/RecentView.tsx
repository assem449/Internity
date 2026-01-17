import { Internship, type InternshipProps } from "./Internship";
import type { InternshipSuggestion } from "./Suggestions";

export interface RecentViewProps {
    className?: string;
    data: InternshipSuggestion[];
}

export const RecentView = ({
    className = "",
    data
}: RecentViewProps) => {
    return (
        <div
            className={`
                flex flex-col gap-2 p-4 w-full max-w-[383px] min-h-[98px]
                bg-DYNAMIC-TERT rounded-[5px] border border-solid border-DYNAMIC-PRIMARY 
                shadow-[0_4px_4px_#8d90a29e] 
                ${className}
            `}
        >
            {/* LABEL SECTION */}
            <div className="font-sans italic text-DYNAMIC-PRIMARY text-sm leading-normal">
                Recent Job Viewed
            </div>

            <Internship
                    key={data[data.length-1].id}
                    data={data[data.length-1]}
                    // No more !left-0 needed; flex handles positioning
                    className="w-full" 
                />
        </div>
    );
};