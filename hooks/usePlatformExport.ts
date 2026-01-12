import { useState, useEffect, useCallback } from 'react';
import { Platform, getPlatformInfo } from '../services/platformService';
import { exportForPlatform, previewPlatformExport } from '../services/exportService';
import { CsvRow } from '../types';

// Declare PapaParse from CDN
declare const Papa: any;

export interface ExportMessage {
  type: 'success' | 'error' | 'warning';
  text: string;
}

export interface DetectedColumns {
  phone: string | null;
  email: string | null;
}

export interface UsePlatformExportReturn {
  // State
  selectedPlatform: Platform;
  showExportMenu: boolean;
  exportMessage: ExportMessage | null;

  // Functions
  setSelectedPlatform: (platform: Platform) => void;
  toggleExportMenu: () => void;
  closeExportMenu: () => void;
  handleDownload: (
    cleanedData: CsvRow[],
    detectedColumns: DetectedColumns,
    fileName: string
  ) => void;
  handleExportToGoogleSheets: (
    cleanedData: CsvRow[],
    detectedColumns: DetectedColumns
  ) => void;
  clearExportMessage: () => void;
}

/**
 * Custom hook for managing platform export functionality
 * Handles state and logic for exporting data to Meta Ads and Google Ads platforms
 */
export const usePlatformExport = (): UsePlatformExportReturn => {
  // State
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('meta');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<ExportMessage | null>(null);

  // Auto-clear exportMessage after 5 seconds
  useEffect(() => {
    if (exportMessage) {
      const timer = setTimeout(() => {
        setExportMessage(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [exportMessage]);

  // Toggle export menu visibility
  const toggleExportMenu = useCallback(() => {
    setShowExportMenu((prev) => !prev);
  }, []);

  // Close export menu
  const closeExportMenu = useCallback(() => {
    setShowExportMenu(false);
  }, []);

  // Clear export message manually
  const clearExportMessage = useCallback(() => {
    setExportMessage(null);
  }, []);

  // Handle CSV download for selected platform
  const handleDownload = useCallback(
    (
      cleanedData: CsvRow[],
      detectedColumns: DetectedColumns,
      fileName: string
    ) => {
      const result = exportForPlatform(
        cleanedData,
        selectedPlatform,
        detectedColumns.phone,
        detectedColumns.email,
        `${selectedPlatform === 'meta' ? 'Meta' : 'Google'}_Ready_${fileName.replace('.csv', '')}`
      );

      if (result.success) {
        setExportMessage({
          type: 'success',
          text: `Exported for ${getPlatformInfo(selectedPlatform).name}`
        });

        // Show warning after success message if there are warnings
        if (result.warnings.length > 0) {
          setTimeout(() => {
            setExportMessage({ type: 'warning', text: result.warnings[0] });
          }, 2000);
        }
      } else {
        setExportMessage({
          type: 'error',
          text: result.errors[0] || 'Export failed'
        });
      }

      setShowExportMenu(false);
    },
    [selectedPlatform]
  );

  // Handle export to Google Sheets (opens in new tab)
  const handleExportToGoogleSheets = useCallback(
    (cleanedData: CsvRow[], detectedColumns: DetectedColumns) => {
      // Transform data for selected platform
      const preview = previewPlatformExport(
        cleanedData,
        selectedPlatform,
        detectedColumns.phone,
        detectedColumns.email,
        cleanedData.length
      );

      if (preview.preview.length === 0) {
        setExportMessage({ type: 'error', text: 'No valid data to export' });
        return;
      }

      // Convert to CSV string using Papa.unparse
      const csv = Papa.unparse(preview.preview);

      // Google Sheets URL for creating new spreadsheet
      const googleSheetsUrl = 'https://docs.google.com/spreadsheets/create';

      // Copy to clipboard for manual paste
      navigator.clipboard
        .writeText(csv)
        .then(() => {
          setExportMessage({
            type: 'success',
            text: 'Data copied! Opening Google Sheets - paste with Ctrl+V'
          });
          window.open(googleSheetsUrl, '_blank');
        })
        .catch(() => {
          // Fallback: trigger download instead
          setExportMessage({
            type: 'warning',
            text: 'Clipboard not available - please use Download CSV instead'
          });
        });

      setShowExportMenu(false);
    },
    [selectedPlatform]
  );

  return {
    // State
    selectedPlatform,
    showExportMenu,
    exportMessage,

    // Functions
    setSelectedPlatform,
    toggleExportMenu,
    closeExportMenu,
    handleDownload,
    handleExportToGoogleSheets,
    clearExportMessage
  };
};

export default usePlatformExport;
