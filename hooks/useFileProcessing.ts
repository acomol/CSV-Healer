import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { CsvRow, ProcessingStatus } from '../types';
import {
  processCsvData,
  detectFormulaErrors,
  detectIfHeaderRow,
  generateAutoHeaders,
  generateQualityReport,
  removeDuplicates,
  DataQualityReport
} from '../utils/csvHelper';

// Declare PapaParse from CDN
declare const Papa: any;

interface DetectedColumns {
  phone: string | null;
  email: string | null;
}

interface UseFileProcessingState {
  data: CsvRow[];
  cleanedData: CsvRow[];
  fileName: string;
  status: ProcessingStatus;
  errorCount: number;
  processingProgress: number;
  autoHeadersGenerated: boolean;
  detectedColumns: DetectedColumns;
  qualityReport: DataQualityReport | null;
}

export interface UseFileProcessingReturn extends UseFileProcessingState {
  handleFileUpload: (file: File) => void;
  handleClean: () => void;
  handleRemoveDuplicates: () => void;
  resetState: () => void;
  setCleanedData: Dispatch<SetStateAction<CsvRow[]>>;
  setQualityReport: Dispatch<SetStateAction<DataQualityReport | null>>;
}

const initialState: UseFileProcessingState = {
  data: [],
  cleanedData: [],
  fileName: '',
  status: ProcessingStatus.IDLE,
  errorCount: 0,
  processingProgress: 0,
  autoHeadersGenerated: false,
  detectedColumns: { phone: null, email: null },
  qualityReport: null
};

export const useFileProcessing = (): UseFileProcessingReturn => {
  const [data, setData] = useState<CsvRow[]>(initialState.data);
  const [cleanedData, setCleanedData] = useState<CsvRow[]>(initialState.cleanedData);
  const [fileName, setFileName] = useState<string>(initialState.fileName);
  const [status, setStatus] = useState<ProcessingStatus>(initialState.status);
  const [errorCount, setErrorCount] = useState<number>(initialState.errorCount);
  const [processingProgress, setProcessingProgress] = useState<number>(initialState.processingProgress);
  const [autoHeadersGenerated, setAutoHeadersGenerated] = useState<boolean>(initialState.autoHeadersGenerated);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumns>(initialState.detectedColumns);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(initialState.qualityReport);

  const handleFileUpload = useCallback((file: File) => {
    setFileName(file.name);
    setStatus(ProcessingStatus.PARSING);
    setCleanedData([]);
    setErrorCount(0);
    setAutoHeadersGenerated(false);
    setDetectedColumns({ phone: null, email: null });
    setQualityReport(null);

    // First pass: parse without headers to detect if first row is data or header
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rawData: string[][] = results.data;

        if (rawData.length === 0) {
          setStatus(ProcessingStatus.ERROR);
          return;
        }

        // Check if first row looks like a header
        const firstRowAsObject: CsvRow = {};
        rawData[0].forEach((val: string, idx: number) => {
          firstRowAsObject[`col_${idx}`] = val;
        });

        const hasHeaderRow = detectIfHeaderRow(firstRowAsObject);

        let finalData: CsvRow[];
        let headersGenerated = false;

        if (hasHeaderRow) {
          // First row is headers - use them as keys
          const headers = rawData[0];
          finalData = rawData.slice(1).map((row: string[]) => {
            const obj: CsvRow = {};
            headers.forEach((header: string, idx: number) => {
              obj[header.trim() || `Column ${idx + 1}`] = row[idx] || '';
            });
            return obj;
          });
        } else {
          // First row is data - generate auto headers
          const columnCount = rawData[0].length;
          const autoHeaders = generateAutoHeaders(columnCount);
          headersGenerated = true;

          finalData = rawData.map((row: string[]) => {
            const obj: CsvRow = {};
            autoHeaders.forEach((header: string, idx: number) => {
              obj[header] = row[idx] || '';
            });
            return obj;
          });
        }

        setAutoHeadersGenerated(headersGenerated);
        setData(finalData);
        const errors = detectFormulaErrors(finalData);
        setErrorCount(errors);
        setStatus(ProcessingStatus.READY);
      },
      error: (error: any) => {
        console.error(error);
        setStatus(ProcessingStatus.ERROR);
      }
    });
  }, []);

  const handleClean = useCallback(() => {
    setStatus(ProcessingStatus.PROCESSING);
    setProcessingProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => Math.min(prev + 15, 90));
    }, 100);

    setTimeout(() => {
      clearInterval(progressInterval);
      setProcessingProgress(100);

      const { cleaned, stats, phoneCol, emailCol } = processCsvData(data);
      setCleanedData(cleaned);
      setDetectedColumns({ phone: phoneCol, email: emailCol });

      // Generate quality report
      const report = generateQualityReport(data, phoneCol, emailCol);
      setQualityReport(report);

      setStatus(ProcessingStatus.COMPLETED);
    }, 800);
  }, [data]);

  const handleRemoveDuplicates = useCallback(() => {
    if (cleanedData.length === 0) return;

    const { phone, email } = detectedColumns;
    const deduplicated = removeDuplicates(cleanedData, phone, email);
    const removedCount = cleanedData.length - deduplicated.length;

    setCleanedData(deduplicated);

    // Update quality report
    if (qualityReport) {
      setQualityReport({
        ...qualityReport,
        duplicates: {
          phones: [],
          emails: [],
          totalDuplicateRows: 0
        },
        qualityScore: Math.min(100, qualityReport.qualityScore + 10),
        recommendations: [
          `Removed ${removedCount} duplicate rows.`,
          ...qualityReport.recommendations.filter(r => !r.includes('duplicate'))
        ]
      });
    }
  }, [cleanedData, detectedColumns, qualityReport]);

  const resetState = useCallback(() => {
    setStatus(ProcessingStatus.IDLE);
    setData([]);
    setCleanedData([]);
    setFileName('');
    setErrorCount(0);
    setAutoHeadersGenerated(false);
    setDetectedColumns({ phone: null, email: null });
    setQualityReport(null);
    setProcessingProgress(0);
  }, []);

  return {
    // State
    data,
    cleanedData,
    fileName,
    status,
    errorCount,
    processingProgress,
    autoHeadersGenerated,
    detectedColumns,
    qualityReport,
    // Functions
    handleFileUpload,
    handleClean,
    handleRemoveDuplicates,
    resetState,
    // Setters (for external updates like from modals)
    setCleanedData,
    setQualityReport
  };
};

export default useFileProcessing;
