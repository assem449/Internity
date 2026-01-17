export interface CareerStatement {
    targetRole?: string;
    goalStatement: string;
}

export interface CareerTrajectoryProps {
    className?: string;
    data: CareerStatement;
}

export const CareerTrajectory = ({
    className = "",
    data
}: CareerTrajectoryProps) => {
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
                YOUR CAREER TRAJECTORY
            </div>

            {/* CONTENT BUBBLE */}
            <div 
                className="
                    flex items-center px-3 py-2 w-full
                    bg-DYNAMIC-SECOND rounded-[5px] border border-solid border-DYNAMIC-PRIMARY
                "
            >
                <p className="font-sans font-bold text-DYNAMIC-PRIMARY text-sm leading-tight">
                    {data.goalStatement}
                </p>
            </div>
        </div>
    );
};