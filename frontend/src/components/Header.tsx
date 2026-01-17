export interface HeaderProps {
    className?: string;
}

export const Header = ({ className = "" }: HeaderProps) => {
    return (
        <div
            className={`
                flex items-center justify-between px-5 w-full max-w-[383px] h-[42px] 
                bg-DYNAMIC-PRIMARY rounded-[5px] shadow-[0_4px_4px_#8d90a29e] sticky top-0
                ${className}
            `}
        >
            {/* BRAND LOGO */}
            <div className="font-sans font-bold text-DYNAMIC-SECOND text-xl leading-none">
                INTERNITY.
            </div>

            {/* CLOSE ACTION / STATUS */}
            <button 
                className="font-sans font-normal text-DYNAMIC-SECOND text-xl leading-none hover:opacity-70 transition-opacity"
                onClick={() => window.close()} 
            >
                x
            </button>
        </div>
    );
};