import { Internship } from "./Internship";

export interface InternshipSuggestion {
    id: string;
    company: string;
    role: string;
    location: string;
    skillTags: string[];
    salary: string;
    logoUrl?: string;
}

export interface SuggestionsProps {
    className?: string;
    data: InternshipSuggestion[];
}

export const Suggestions = ({ className = "", data }: SuggestionsProps) => {
    return (
        <div
            className={`
                flex flex-col w-full max-w-[383px] max-h-[350px] p-4
                bg-DYNAMIC-TERT rounded-[5px] border border-solid border-DYNAMIC-PRIMARY 
                shadow-[0_4px_4px_#8d90a29e] 
                ${className}
            `}
        >
            {/* HEADER LABEL */}
            <div className="mb-3 font-sans italic text-DYNAMIC-PRIMARY text-sm leading-normal">
                INTERNITY SUGGESTS
            </div>

            {/* SCROLLABLE LIST CONTAINER */}
            <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
                {data.map((suggestion) => (
                    <Internship
                        key={suggestion.id}
                        data={suggestion}
                        // No more !left-0 needed; flex handles positioning
                        className="w-full" 
                    />
                ))}
            </div>
        </div>
    );
};