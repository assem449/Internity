import type { InternshipProps } from "./Internship";

export const InternshipLinked = ({ className = "", data }: InternshipProps) => {
    return (
        <div
            className={`
                flex items-center gap-4 p-3 w-full max-w-[400px] min-h-[86px]
                bg-DYNAMIC-SECOND rounded-[5px] border border-solid border-DYNAMIC-PRIMARY
                hover:shadow-md transition-shadow cursor-pointer
                ${className}
            `}
        >
            <a href={data.jobUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 w-full">
                <div className="flex flex-col justify-center overflow-hidden">
                    <h3 className="font-sans font-bold text-DYNAMIC-PRIMARY text-lg truncate leading-tight">
                        {data.role}
                    </h3>
                    <p className="font-sans italic text-DYNAMIC-PRIMARY text-sm truncate">
                        {data.company}
                    </p>
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
            </a>
        </div>
    );
};