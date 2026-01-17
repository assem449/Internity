import { DUMMY_ANALYTICS, DUMMY_CAREER_TRAJECTORY, DUMMY_SUGGESTIONS } from "../../shared/constants";
import { Analytics } from "../../components/Analytics";
import { CareerTrajectory } from "../../components/CareerTrajectory";
import { Header } from "../../components/Header";
import { Suggestions } from "../../components/Suggestions";

export interface PopupProps {
    className?: string;
}

export const PopupApp = ({ className = "" }: PopupProps) => {
    return (
        /* 1. Main Wrapper: 
           Standardize width to 430px (typical for extension popups).
           Changed to min-h-screen or a fixed height depending on your design.
        */
        <div
            className={`
                w-[430px] min-h-[632px] overflow-x-hidden
                bg-DYNAMIC-BACKGROUND backdrop-blur-sm
                flex flex-col items-center h-full
                ${className}
            `}
        >
            {/* 2. Inner Container:
               Using flex-col and gap-6 (24px) to handle the 27px spacing 
               from your Figma export more cleanly.
            */}
            <div className="flex flex-col w-full px-6 py-7 gap-6">
                <Header />
                <Analytics data={DUMMY_ANALYTICS} />
                <CareerTrajectory data={DUMMY_CAREER_TRAJECTORY} />
                <Suggestions data={DUMMY_SUGGESTIONS} />
            </div>
        </div>
    );
};