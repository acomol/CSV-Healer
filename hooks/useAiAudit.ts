import { useState, useCallback } from 'react';
import { CsvRow } from '../types';
import { auditCsvData } from '../services/geminiService';

export interface UseAiAuditReturn {
  // State
  aiReport: string;
  isAiLoading: boolean;
  showKeyModal: boolean;
  apiKey: string;

  // Functions
  handleAiAudit: (data: CsvRow[]) => Promise<void>;
  setApiKey: (key: string) => void;
  clearReport: () => void;
  openKeyModal: () => void;
  closeKeyModal: () => void;
}

/**
 * Custom hook for managing AI audit functionality
 * Handles state and logic for auditing CSV data with Gemini AI
 */
export const useAiAudit = (): UseAiAuditReturn => {
  // State
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKey, setApiKeyState] = useState<string>('');

  // Open the API key modal
  const openKeyModal = useCallback(() => {
    setShowKeyModal(true);
  }, []);

  // Close the API key modal
  const closeKeyModal = useCallback(() => {
    setShowKeyModal(false);
  }, []);

  // Set the API key
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
  }, []);

  // Clear the AI report
  const clearReport = useCallback(() => {
    setAiReport('');
  }, []);

  // Handle AI audit of CSV data
  const handleAiAudit = useCallback(async (data: CsvRow[]): Promise<void> => {
    // Check if API key is empty and open modal if so
    if (!apiKey) {
      openKeyModal();
      return;
    }

    setIsAiLoading(true);
    setAiReport('');

    try {
      const report = await auditCsvData(apiKey, data);
      setAiReport(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setAiReport(`Error: ${errorMessage}`);
    } finally {
      setIsAiLoading(false);
    }
  }, [apiKey, openKeyModal]);

  return {
    // State
    aiReport,
    isAiLoading,
    showKeyModal,
    apiKey,

    // Functions
    handleAiAudit,
    setApiKey,
    clearReport,
    openKeyModal,
    closeKeyModal
  };
};

export default useAiAudit;
