interface BehaviorAnalytics {
    totalTracked: number;
    appliedCount: number;
    viewedCount: number;
    topRole: string;
    interviewRate: string;
    responseTime: string;
}

export interface AnalyticsProps {
    className?: string;
    data: BehaviorAnalytics;
}

export const Analytics = ({ className = "", data }: AnalyticsProps) => {
    return (
        <div
            className={`
                flex gap-4 p-4 w-full max-w-[383px] min-h-[115px]
                bg-DYNAMIC-SECOND rounded-[5px] border border-solid border-DYNAMIC-PRIMARY 
                shadow-[0_4px_4px_#8d90a29e] 
                ${className}
            `}
        >
            {/* 1. TOP ROLE SECTION */}
            <div className="flex flex-col flex-[1.1] gap-1">
                <span className="font-sans italic text-DYNAMIC-PRIMARY text-[10px] leading-none">
                    TOP ROLE
                </span>
                <div className="flex items-center justify-center h-full px-2 bg-DYNAMIC-accent2 rounded-[5px] border border-solid border-DYNAMIC-PRIMARY">
                    <span className="font-sans font-bold text-DYNAMIC-SECOND text-sm text-center leading-tight uppercase">
                        {data.topRole}
                    </span>
                </div>
            </div>

            {/* 2. JOBS TRACKED SECTION */}
            <div className="flex flex-col flex-1 gap-1">
                <span className="font-sans italic text-DYNAMIC-PRIMARY text-[10px] leading-none text-center">
                    JOBS TRACKED
                </span>
                <div className="flex gap-2 h-full">
                    {/* Viewed Stats */}
                    <div className="flex flex-col flex-1 items-center justify-center bg-DYNAMIC-accent2 rounded-[5px] border border-solid border-DYNAMIC-PRIMARY py-1">
                        <span className="font-sans font-bold text-DYNAMIC-SECOND text-xl">
                            {data.viewedCount}
                        </span>
                        <span className="font-sans italic text-DYNAMIC-SECOND text-[8px] uppercase">
                            Viewed
                        </span>
                    </div>

                    {/* Applied Stats */}
                    <div className="flex flex-col flex-1 items-center justify-center bg-DYNAMIC-accent2 rounded-[5px] border border-solid border-DYNAMIC-PRIMARY py-1">
                        <span className="font-sans font-bold text-DYNAMIC-SECOND text-xl">
                            {data.appliedCount}
                        </span>
                        <span className="font-sans italic text-DYNAMIC-SECOND text-[8px] uppercase">
                            Applied
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};