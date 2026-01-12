import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Play, AlertTriangle, CheckCircle2, RefreshCw, Wand2, ShieldCheck, ArrowRight, Eye } from 'lucide-react';
import { CsvRow, ProcessingStatus } from './types';
import { processCsvData, detectFormulaErrors } from './utils/csvHelper';
import { auditCsvData } from './services/geminiService';
import { ApiKeyModal } from './components/ApiKeyModal';
import { VerificationModal } from './components/VerificationModal';

// Declare PapaParse from CDN
declare const Papa: any;

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [data, setData] = useState<CsvRow[]>([]);
  const [cleanedData, setCleanedData] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  
  // Verification State
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verifyRowIndex, setVerifyRowIndex] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus(ProcessingStatus.PARSING);
    setAiReport('');
    setCleanedData([]);
    setErrorCount(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        setData(results.data);
        const errors = detectFormulaErrors(results.data);
        setErrorCount(errors);
        setStatus(ProcessingStatus.READY);
      },
      error: (error: any) => {
        console.error(error);
        setStatus(ProcessingStatus.ERROR);
      }
    });
  };

  const handleClean = () => {
    setStatus(ProcessingStatus.PROCESSING);
    // Simulate slight delay for UX
    setTimeout(() => {
      const processed = processCsvData(data);
      setCleanedData(processed);
      setStatus(ProcessingStatus.COMPLETED);
    }, 600);
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
    link.setAttribute('download', `fixed_${fileName}`);
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
      const report = await auditCsvData(apiKey, data);
      setAiReport(report);
    } catch (e) {
      alert("Failed to run AI audit. Check console for details.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <ApiKeyModal 
        isOpen={showKeyModal} 
        onClose={() => setShowKeyModal(false)} 
        onSave={(key) => {
          setApiKey(key);
          // Auto trigger after save
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

      {/* Hero Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">CSV Healer</h1>
              <p className="text-xs text-slate-500 font-medium">Marketing Data Sanitizer</p>
            </div>
          </div>
          {status !== ProcessingStatus.IDLE && (
             <button 
               onClick={() => {
                 setStatus(ProcessingStatus.IDLE);
                 setData([]);
                 setCleanedData([]);
                 setAiReport('');
               }}
               className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
             >
               Start Over
             </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        
        {/* State: Upload */}
        {status === ProcessingStatus.IDLE && (
          <div className="max-w-xl mx-auto mt-10">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-slate-300 bg-white rounded-2xl p-12 text-center hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Upload className="text-indigo-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload your broken CSV</h3>
              <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
                Fix "Action Needed" errors, sanitize Excel formulas in phone numbers, and prepare your list for ads.
              </p>
              <button className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
                Select CSV File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileUpload} 
              />
            </div>
          </div>
        )}

        {/* State: Analysis & Action */}
        {(status === ProcessingStatus.READY || status === ProcessingStatus.PROCESSING || status === ProcessingStatus.COMPLETED) && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Total Rows</p>
                    <p className="text-2xl font-bold text-slate-800">{data.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${errorCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {errorCount > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Formula Errors</p>
                    <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {errorCount} <span className="text-sm font-normal text-slate-400">found</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 shadow-lg text-white">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider mb-1">Status</p>
                    <h3 className="text-2xl font-bold">
                      {status === ProcessingStatus.COMPLETED ? 'Fixed & Ready' : 'Analysis Complete'}
                    </h3>
                  </div>
                  
                  {status !== ProcessingStatus.COMPLETED ? (
                    <button 
                      onClick={handleClean}
                      className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Run Cleaner
                    </button>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <button 
                         onClick={handleVerify}
                         className="flex-1 py-2 bg-indigo-800/30 hover:bg-indigo-800/50 border border-indigo-400/30 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                         title="Verify data correctness with random sample"
                       >
                         <Eye className="w-4 h-4" />
                         Verify
                       </button>
                       <button 
                         onClick={handleDownload}
                         className="flex-1 py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                       >
                         <Download className="w-4 h-4" />
                         Download
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Data Preview */}
              <div className="lg:col-span-2 space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-400" />
                      Data Preview (First 5 Rows)
                    </h3>
                    <div className="flex gap-2">
                       <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">Original</span>
                       {status === ProcessingStatus.COMPLETED && (
                         <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                           <ArrowRight className="w-3 h-3" /> Cleaned
                         </span>
                       )}
                    </div>
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
                        {(status === ProcessingStatus.COMPLETED ? cleanedData : data).slice(0, 5).map((row, idx) => (
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
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-center text-slate-500">
                       Showing preview of columns 1-4
                    </div>
                 </div>
              </div>

              {/* Gemini AI Assistant Sidebar */}
              <div className="space-y-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-500" />
                    AI Data Auditor
                 </h3>
                 
                 <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Wand2 size={100} />
                    </div>
                    
                    {!aiReport ? (
                      <div className="relative z-10 text-center py-6">
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                          Use Gemini to analyze the language, region, and structural integrity of your contact list before exporting.
                        </p>
                        <button 
                          onClick={handleAiAudit}
                          disabled={isAiLoading}
                          className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors border border-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                          {isAiLoading ? (
                            <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                          Analyze with Gemini
                        </button>
                      </div>
                    ) : (
                      <div className="relative z-10">
                        <h4 className="font-semibold text-indigo-900 mb-3 border-b border-indigo-100 pb-2">Analysis Report</h4>
                        <div className="prose prose-sm prose-indigo text-slate-600 max-h-64 overflow-y-auto pr-2">
                          <div className="whitespace-pre-wrap">{aiReport}</div>
                        </div>
                        <button 
                          onClick={() => setAiReport('')}
                          className="mt-4 text-xs text-indigo-500 hover:text-indigo-700 font-medium underline"
                        >
                          Clear Analysis
                        </button>
                      </div>
                    )}
                 </div>
                 
                 {/* Quick Fix Info Card */}
                 <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                    <h4 className="font-semibold text-amber-800 mb-2 text-sm flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" />
                       About the Error
                    </h4>
                    <p className="text-xs text-amber-700/80 leading-relaxed">
                       Your CSV contains "Excel Formula Injection" artifacts (e.g., <code>="{`{number}`}"</code>). 
                       This happens when exporting from certain systems to force Excel to treat numbers as text. 
                       Our "Run Cleaner" tool strips these artifacts automatically.
                    </p>
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
