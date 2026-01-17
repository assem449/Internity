import type { InternshipSuggestion } from "./Suggestions";

export interface InternshipProps {
    className?: string; // Optional for better flexibility
    data: InternshipSuggestion;
}

export const Internship = ({ className = "", data }: InternshipProps) => {
    return (
        <div
            className={`
                flex items-center gap-4 p-3 w-full max-w-[400px] min-h-[86px]
                bg-DYNAMIC-SECOND rounded-[5px] border border-solid border-DYNAMIC-PRIMARY
                hover:shadow-md transition-shadow cursor-pointer
                ${className}
            `}
        >
            {/* 1. LOGO SECTION - Flexible Container */}
            <div className="flex-shrink-0 w-16 h-16 bg-DYNAMIC-PRIMARY rounded-[5px] flex items-center justify-center">
                {data.logoUrl ? (
                    <img src={data.logoUrl} alt={data.company} className="w-12 h-12 object-contain" />
                ) : (
                    <span className="font-sans italic text-DYNAMIC-SECOND text-[10px]">
                        LOGO
                    </span>
                )}
            </div>

            {/* 2. CONTENT SECTION - Vertical Stack */}
            <div className="flex flex-col justify-center overflow-hidden">
                <h3 className="font-sans font-bold text-DYNAMIC-PRIMARY text-lg truncate leading-tight">
                    {data.role}
                </h3>
                
                <p className="font-sans italic text-DYNAMIC-PRIMARY text-sm truncate">
                    {data.company}
                </p>

                {/* 3. SKILLS SECTION - Auto-wrapping tags */}
                <div className="mt-1 flex flex-wrap gap-1">
                    {data.skillTags.map((skill) => (
                        <span 
                            key={skill}
                            className="font-sans italic text-DYNAMIC-PRIMARY text-[10px] opacity-80"
                        >
                            #{skill.toLowerCase()}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};