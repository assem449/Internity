// src/components/Suggestions.tsx
// import { Internship } from "./Internship";
import { InternshipLinked } from "./InternshipLinked";

export interface InternshipSuggestion {
    id: string;
    company: string;
    role: string;
    location: string;
    skillTags: string[];
    salary: string;
    logoUrl?: string;
    jobUrl?: string;
}

export interface SuggestionsProps {
    className?: string;
    data: InternshipSuggestion[];
}

export const Suggestions = ({ className = "", data = [] }: SuggestionsProps) => {
    // If data is null or empty, show a placeholder
    if (!data || data.length === 0) {
        return (
            <div className={`p-4 bg-DYNAMIC-TERT rounded-[5px] border border-DYNAMIC-PRIMARY ${className}`}>
                <div className="font-sans italic text-DYNAMIC-PRIMARY text-sm">INTERNITY SUGGESTS</div>
                <p className="text-xs text-DYNAMIC-PRIMARY opacity-60 mt-4">Keep browsing jobs to see recommendations!</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col w-full max-w-[383px] max-h-[350px] p-4 bg-DYNAMIC-TERT rounded-[5px] border border-solid border-DYNAMIC-PRIMARY shadow-[0_4px_4px_#8d90a29e] ${className}`}>
            <div className="mb-3 font-sans italic text-DYNAMIC-PRIMARY text-sm leading-normal">
                INTERNITY SUGGESTS
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
                {data.map((suggestion) => (
                    <InternshipLinked
                        key={suggestion.id}
                        data={suggestion}
                        className="w-full" 
                    />
                ))}
            </div>
        </div>
    );
};