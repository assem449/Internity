import React from 'react';

interface ConfirmationPopupProps {
  externalUrl: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({ externalUrl, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-mono">
      {/* Container matching the "Internity" styling */}
      <div className="w-full max-w-md bg-DYNAMIC-BG rounded-lg shadow-2xl overflow-hidden border border-[var(--variable-collection-DYNAMIC-TERT)]">
        
        {/* Header Bar */}
        <div className="bg-DYNAMIC-PRIMARY p-4 flex justify-between items-center">
          <h1 className="text-white text-xl font-bold tracking-tight">INTERNITY.</h1>
          <button onClick={onCancel} className="text-white hover:opacity-70 transition-opacity text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Alert - Similar to "Viewing a job posting" blue bar */}
          <div className="bg-[#1e293b] text-blue-200 p-3 rounded flex items-center gap-2 text-sm">
            <span role="img" aria-label="check">🎯</span>
            Confirming your application status
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-[var(--variable-collection-DYNAMIC-PRIMARY)] text-lg font-bold">
              Did you apply to this job?
            </h2>
            <p className="text-[var(--variable-collection-DYNAMIC-NEUTRALGRAY)] text-sm">
              We'll update your "Jobs Tracked" stats if you say yes!
            </p>
          </div>

          {/* Job Info Box - Styled like the "Recent Job Viewed" card */}
          <div className="bg-[var(--variable-collection-DYNAMIC-TERT)]/30 border border-[var(--variable-collection-DYNAMIC-TERT)] p-4 rounded-md">
            <p className="text-[var(--variable-collection-DYNAMIC-NEUTRALGRAY)] text-xs font-bold uppercase mb-1">
              Application Site
            </p>
            <p className="text-[var(--variable-collection-DYNAMIC-PRIMARY)] font-medium break-all text-sm">
              {externalUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={onConfirm}
              className="w-full py-3 bg-[var(--variable-collection-DYNAMIC-accent2)] hover:brightness-90 text-white font-bold rounded shadow-md transition-all active:scale-[0.98]"
            >
              ✓ Yes, I Applied
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-3 bg-transparent border-2 border-[var(--variable-collection-DYNAMIC-NEUTRALGRAY)] text-[var(--variable-collection-DYNAMIC-NEUTRALGRAY)] font-bold rounded hover:bg-[var(--variable-collection-DYNAMIC-SECOND)] transition-colors"
            >
              ✕ No, Not Yet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;