import { useState, useEffect } from 'react';

export const useApplicationConfirmation = () => {
  const [data, setData] = useState<{ jobId: string; externalUrl: string } | null>(null);

  useEffect(() => {
    // Replaces the initial chrome.storage.local.get call
    chrome.storage.local.get(['jobId', 'jobUrl'], (result) => {
      setData({
        jobId: result.jobId as string || '',
        externalUrl: result.jobUrl as string || 'Unknown'
      });
    });
  }, []);

  const handleResponse = (status: 'APPLIED' | 'SKIPPED') => {
    if (!data) return;

    // Replaces the chrome.runtime.sendMessage logic
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION_STATUS',
      data: {
        jobId: data.jobId,
        status: status,
        externalUrl: data.externalUrl
      }
    }, () => {
      window.close(); // Closes the popup after response
    });
  };

  return { data, handleResponse };
};