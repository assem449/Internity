import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import ConfirmationPopup from './ConfirmationPopup.tsx'
import { useApplicationConfirmation } from './useApplicationConfirmation.ts'

const ConfirmEntry = () => {
  const { data, handleResponse } = useApplicationConfirmation();

  if (!data) {
    // Optional: Return a small loading state that matches your theme
    return <div className="min-h-[400px] bg-[var(--variable-collection-DYNAMIC-BG)]" />;
  }

  return (
    <StrictMode>
      <ConfirmationPopup 
        externalUrl={data.externalUrl} 
        onConfirm={() => handleResponse('APPLIED')} 
        onCancel={() => handleResponse('SKIPPED')} 
      />
    </StrictMode>
  );
};

createRoot(document.getElementById('root')!).render(<ConfirmEntry />);