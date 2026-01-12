import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Play, AlertTriangle, CheckCircle2, RefreshCw, Wand2, ShieldCheck, ArrowRight, Eye, Facebook, BarChart3, XCircle, Mail, Phone, Info, TrendingUp, Trash2 } from 'lucide-react';
import { CsvRow, ProcessingStatus, FbStats } from './types';
import { processCsvData, detectFormulaErrors, detectIfHeaderRow, generateAutoHeaders, generateQualityReport, removeDuplicates, DataQualityReport } from './utils/csvHelper';
import { auditCsvData } from './services/geminiService';
import { ApiKeyModal } from './components/ApiKeyModal';
import { VerificationModal } from './components/VerificationModal';
import { DropZone } from './components/DropZone';
import { ProgressBar } from './components/ProgressBar';
import { QualityReportModal } from './components/QualityReportModal';

// Declare PapaParse from CDN
declare const Papa: any;

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [data, setData] = useState<CsvRow[]>([]);
  const [cleanedData, setCleanedData] = useState<CsvRow[]>([]);
  const [fbStats, setFbStats] = useState<FbStats | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  
  // Verification State
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verifyRowIndex, setVerifyRowIndex] = useState<number>(0);

  // Header detection state
  const [autoHeadersGenerated, setAutoHeadersGenerated] = useState<boolean>(false);
  const [detectedColumns, setDetectedColumns] = useState<{ phone: string | null; email: string | null }>({ phone: null, email: null });

  // Quality report state
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [showQualityModal, setShowQualityModal] = useState<boolean>(false);

  // Progress state
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus(ProcessingStatus.PARSING);
    setAiReport('');
    setCleanedData([]);
    setErrorCount(0);
    setFbStats(null);
    setAutoHeadersGenerated(false);
    setDetectedColumns({ phone: null, email: null });

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
  };

  // Handle file from DropZone component
  const handleFileFromDropZone = (file: File) => {
    // Create a synthetic event to reuse existing logic
    const syntheticEvent = {
      target: { files: [file] }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(syntheticEvent);
  };

  const handleClean = () => {
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
      setFbStats(stats);
      setDetectedColumns({ phone: phoneCol, email: emailCol });

      // Generate quality report
      const report = generateQualityReport(data, phoneCol, emailCol);
      setQualityReport(report);

      setStatus(ProcessingStatus.COMPLETED);
    }, 800);
  };

  const handleRemoveDuplicates = () => {
    if (cleanedData.length === 0) return;

    const { phone, email } = detectedColumns;
    const deduplicated = removeDuplicates(cleanedData, phone, email);
    const removedCount = cleanedData.length - deduplicated.length;

    setCleanedData(deduplicated);

    // Update stats
    if (fbStats) {
      setFbStats({
        ...fbStats,
        totalRows: deduplicated.length
      });
    }

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
        recommendations: [`Removed ${removedCount} duplicate rows.`, ...qualityReport.recommendations.filter(r => !r.includes('duplicate'))]
      });
    }

    setShowQualityModal(false);
  };

  const handleVerify = () => {
    if (data.length === 0) return;
    const randomIndex = Math.floor(Math.random() * data.length);
    setVerifyRowIndex(randomIndex);
    setShowVerifyModal(true);
  };

  const handleDownload = () => {
    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FB_Ready_${fileName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAiAudit = async () => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    setIsAiLoading(true);
    try {
      const datasetToAudit = cleanedData.length > 0 ? cleanedData : data;
      const report = await auditCsvData(apiKey, datasetToAudit);
      setAiReport(report);
    } catch (e) {
      alert("Failed to run AI audit. Check console for details.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <ApiKeyModal 
        isOpen={showKeyModal} 
        onClose={() => setShowKeyModal(false)} 
        onSave={(key) => {
          setApiKey(key);
          setTimeout(() => handleAiAudit(), 500); 
        }} 
      />
      
      <VerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        originalRow={data[verifyRowIndex]}
        cleanedRow={cleanedData[verifyRowIndex]}
        rowIndex={verifyRowIndex}
        onNext={handleVerify}
      />

      <QualityReportModal
        isOpen={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        report={qualityReport}
        onRemoveDuplicates={handleRemoveDuplicates}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Facebook size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">FB Audience Healer</h1>
              <p className="text-xs text-slate-500 font-medium">Meta Guidelines Enforcer (Israel +972)</p>
            </div>
          </div>
          {status !== ProcessingStatus.IDLE && (
             <button
               onClick={() => {
                 setStatus(ProcessingStatus.IDLE);
                 setData([]);
                 setCleanedData([]);
                 setAiReport('');
                 setFbStats(null);
                 setAutoHeadersGenerated(false);
                 setDetectedColumns({ phone: null, email: null });
                 setQualityReport(null);
                 setProcessingProgress(0);
               }}
               className="text-sm font-medium text-slate-500 hover:text-[#1877F2] transition-colors"
             >
               New File
             </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        
        {/* Upload State - Using DropZone Component */}
        {status === ProcessingStatus.IDLE && (
          <DropZone onFileSelect={handleFileFromDropZone} accept=".csv" />
        )}

        {/* Dashboard State */}
        {(status === ProcessingStatus.READY || status === ProcessingStatus.PROCESSING || status === ProcessingStatus.COMPLETED) && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* FB Readiness Stats - Only show after cleaning */}
            {status === ProcessingStatus.COMPLETED && fbStats && (
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                       <BarChart3 className="w-4 h-4" /> Match Potential
                     </span>
                     <div className="mt-2">
                        <span className="text-3xl font-bold text-[#1877F2]">{fbStats.matchRateEstimate}</span>
                        <p className="text-xs text-slate-400 mt-1">Estimated rows usable by Meta</p>
                     </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                       <Phone className="w-4 h-4 text-green-600" /> Valid Phones
                     </span>
                     <div className="mt-2">
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-slate-800">{fbStats.validPhones}</span>
                            <span className="text-xs text-green-600 font-medium mb-1.5">({fbStats.fixedPhones} fixed)</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Formatted as 972xxxxxxxxx</p>
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                       <Mail className="w-4 h-4 text-blue-500" /> Valid Emails
                     </span>
                     <div className="mt-2">
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-slate-800">{fbStats.validEmails}</span>
                            <span className="text-xs text-blue-600 font-medium mb-1.5">({fbStats.fixedEmails} fixed)</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Lowercase & Trimmed</p>
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                       <XCircle className="w-4 h-4 text-red-500" /> Invalid Rows
                     </span>
                     <div className="mt-2">
                        <span className="text-3xl font-bold text-red-500">{fbStats.invalidPhones}</span>
                        <p className="text-xs text-slate-400 mt-1">Scientific notation / Bad data</p>
                     </div>
                  </div>
               </div>
            )}

            {/* Smart Detection Info Banner */}
            {(autoHeadersGenerated || (status === ProcessingStatus.COMPLETED && (detectedColumns.phone || detectedColumns.email))) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  {autoHeadersGenerated && (
                    <p className="text-blue-800 font-medium">
                      🔍 Smart Detection: No headers found in file. Auto-generated column names (Column 1, Column 2, etc.)
                    </p>
                  )}
                  {status === ProcessingStatus.COMPLETED && (detectedColumns.phone || detectedColumns.email) && (
                    <p className="text-blue-700 mt-1">
                      📊 Detected columns (scanned first 50 rows):
                      {detectedColumns.phone && <span className="ml-2 bg-blue-100 px-2 py-0.5 rounded text-blue-800">Phone: <code>{detectedColumns.phone}</code></span>}
                      {detectedColumns.email && <span className="ml-2 bg-blue-100 px-2 py-0.5 rounded text-blue-800">Email: <code>{detectedColumns.email}</code></span>}
                      {!detectedColumns.phone && <span className="ml-2 bg-yellow-100 px-2 py-0.5 rounded text-yellow-800">⚠️ No phone column detected</span>}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Main Action Bar */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full ${errorCount > 0 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {status === ProcessingStatus.COMPLETED ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {status === ProcessingStatus.COMPLETED ? 'Meta Guidelines Applied' : `${data.length} Rows Loaded`}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {status === ProcessingStatus.COMPLETED
                        ? 'Phones sanitized (+972), Emails lowercased. Ready for Ads Manager.'
                        : `Found ${errorCount} formatting errors. Emails will be lowercased.`}
                    </p>
                  </div>
               </div>
               
               <div className="flex gap-3 w-full md:w-auto">
                  {status === ProcessingStatus.PROCESSING ? (
                    <div className="flex-1 md:w-64">
                      <ProgressBar progress={processingProgress} label="Processing..." />
                    </div>
                  ) : status !== ProcessingStatus.COMPLETED ? (
                    <button
                      onClick={handleClean}
                      className="flex-1 md:flex-none py-3 px-8 bg-[#1877F2] hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Fix All & Format
                    </button>
                  ) : (
                    <>
                       <button
                         onClick={() => setShowQualityModal(true)}
                         className="flex-1 md:flex-none py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                       >
                         <TrendingUp className="w-5 h-5" />
                         Quality Report
                       </button>
                       <button
                         onClick={handleVerify}
                         className="flex-1 md:flex-none py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                       >
                         <Eye className="w-5 h-5" />
                         Check Random
                       </button>
                       <button
                         onClick={handleDownload}
                         className="flex-1 md:flex-none py-3 px-8 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                       >
                         <Download className="w-5 h-5" />
                         Download FB CSV
                       </button>
                    </>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Data Preview */}
              <div className="lg:col-span-2 space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-400" />
                      Preview
                    </h3>
                    {status === ProcessingStatus.COMPLETED && (
                       <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-medium">
                         Showing optimized data
                       </span>
                    )}
                 </div>
                 
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                          {data.length > 0 && Object.keys(data[0]).slice(0, 4).map((header) => (
                            <th key={header} className="px-6 py-4 whitespace-nowrap">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(status === ProcessingStatus.COMPLETED ? cleanedData : data).slice(0, 8).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            {Object.values(row).slice(0, 4).map((cell, cIdx) => (
                              <td key={cIdx} className="px-6 py-4 max-w-xs truncate font-mono text-slate-600">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>

              {/* AI Assistant */}
              <div className="space-y-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-500" />
                    AI Validation
                 </h3>
                 
                 <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <Facebook size={100} />
                    </div>
                    
                    {!aiReport ? (
                      <div className="relative z-10 text-center py-6">
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                          {status === ProcessingStatus.COMPLETED 
                            ? "Validate against Meta's email case sensitivity and phone format rules."
                            : "Analyze structural integrity before cleaning."}
                        </p>
                        <button 
                          onClick={handleAiAudit}
                          disabled={isAiLoading}
                          className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors border border-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                          {isAiLoading ? (
                            <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <span className="flex items-center gap-2">
                               <ShieldCheck className="w-4 h-4" />
                               {status === ProcessingStatus.COMPLETED ? "Verify for Meta Ads" : "Analyze Structure"}
                            </span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="relative z-10">
                        <h4 className="font-semibold text-indigo-900 mb-3 border-b border-indigo-100 pb-2">
                          {status === ProcessingStatus.COMPLETED ? "Readiness Report" : "Data Analysis"}
                        </h4>
                        <div className="prose prose-sm prose-indigo text-slate-600 max-h-64 overflow-y-auto pr-2 text-xs">
                          <div className="whitespace-pre-wrap">{aiReport}</div>
                        </div>
                        <button 
                          onClick={() => setAiReport('')}
                          className="mt-4 text-xs text-indigo-500 hover:text-indigo-700 font-medium underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;