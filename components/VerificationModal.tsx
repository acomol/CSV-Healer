import React from 'react';
import { X, RefreshCw, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { CsvRow } from '../types';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalRow: CsvRow | null;
  cleanedRow: CsvRow | null;
  rowIndex: number;
  onNext: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen, onClose, originalRow, cleanedRow, rowIndex, onNext
}) => {
  if (!isOpen || !originalRow || !cleanedRow) return null;

  const keys = Object.keys(originalRow);
  const changesCount = keys.filter(key => originalRow[key] !== cleanedRow[key]).length;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/20 p-2 rounded-lg ring-1 ring-indigo-500/30">
                <Check className="w-5 h-5 text-indigo-300" />
             </div>
             <div>
               <h3 className="font-bold text-lg tracking-tight">Data Verification Mode</h3>
               <p className="text-slate-400 text-xs font-medium">Random Check • Row #{rowIndex + 1}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 bg-slate-50/50">
           <table className="w-full text-sm text-left border-collapse">
             <thead className="bg-white text-slate-500 sticky top-0 shadow-sm z-10 text-xs uppercase tracking-wider">
               <tr>
                  <th className="px-6 py-4 font-semibold border-b border-slate-200 w-1/4 bg-slate-50">Column Name</th>
                  <th className="px-6 py-4 font-semibold border-b border-slate-200 w-1/3 text-red-600 bg-red-50/30 border-r border-red-100">Original Value</th>
                  <th className="px-6 py-4 font-semibold border-b border-slate-200 w-1/3 text-green-700 bg-green-50/30">Cleaned Value</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-200 bg-white">
               {keys.map((key) => {
                 const isChanged = originalRow[key] !== cleanedRow[key];
                 return (
                   <tr key={key} className={`group transition-colors ${isChanged ? "bg-yellow-50" : "hover:bg-slate-50"}`}>
                     <td className="px-6 py-4 font-medium text-slate-500 border-r border-slate-100 group-hover:text-slate-700">
                       {key}
                     </td>
                     <td className={`px-6 py-4 font-mono text-slate-600 border-r border-slate-100 break-all relative ${isChanged ? 'text-red-700 bg-red-50/20' : ''}`}>
                       {originalRow[key] || <span className="text-slate-300 italic opacity-50">empty</span>}
                       {isChanged && (
                         <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-300 opacity-0 group-hover:opacity-100">
                           <AlertTriangle size={16} />
                         </div>
                       )}
                     </td>
                     <td className={`px-6 py-4 font-mono text-slate-600 break-all ${isChanged ? 'text-green-700 bg-green-50/20 font-semibold' : ''}`}>
                       {cleanedRow[key] || <span className="text-slate-300 italic opacity-50">empty</span>}
                       {isChanged && <span className="sr-only">(Modified)</span>}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${changesCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              {changesCount}
            </span>
            <span className="text-sm text-slate-600 font-medium">fields cleaned in this row</span>
          </div>
          
          <div className="flex gap-3">
             <button 
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
            >
              Close
            </button>
            <button 
              onClick={onNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-indigo-200 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Verify Another Row
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
