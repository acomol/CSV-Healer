import React from 'react';
import { X, AlertTriangle, CheckCircle2, XCircle, Copy, Trash2, TrendingUp } from 'lucide-react';
import { DataQualityReport } from '../utils/csvHelper';

interface QualityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DataQualityReport | null;
  onRemoveDuplicates?: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBg = (score: number): string => {
  if (score >= 80) return 'bg-green-100';
  if (score >= 50) return 'bg-yellow-100';
  return 'bg-red-100';
};

const getErrorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    excel_formula: 'Excel Formula',
    scientific_notation: 'Scientific Notation',
    invalid_format: 'Invalid Format',
    empty: 'Empty Values',
    too_short: 'Too Short',
    too_long: 'Too Long'
  };
  return labels[type] || type;
};

const getErrorTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    excel_formula: '📊',
    scientific_notation: '🔢',
    invalid_format: '❌',
    empty: '⬜',
    too_short: '📏',
    too_long: '📐'
  };
  return icons[type] || '⚠️';
};

export const QualityReportModal: React.FC<QualityReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onRemoveDuplicates
}) => {
  if (!isOpen || !report) return null;

  const { duplicates, errors, qualityScore, recommendations } = report;
  const totalPhoneErrors = errors.phone.reduce((sum, e) => sum + e.count, 0);
  const totalEmailErrors = errors.email.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg">Data Quality Report</h3>
              <p className="text-indigo-200 text-xs">Comprehensive analysis of your CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Quality Score */}
          <div className={`${getScoreBg(qualityScore)} rounded-xl p-6 text-center`}>
            <div className="text-sm font-medium text-slate-600 mb-2">Overall Quality Score</div>
            <div className={`text-6xl font-bold ${getScoreColor(qualityScore)}`}>
              {qualityScore}
              <span className="text-2xl">/100</span>
            </div>
            <div className="mt-2 flex justify-center gap-1">
              {qualityScore >= 80 && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {qualityScore >= 50 && qualityScore < 80 && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
              {qualityScore < 50 && <XCircle className="w-5 h-5 text-red-600" />}
              <span className={`text-sm font-medium ${getScoreColor(qualityScore)}`}>
                {qualityScore >= 80 ? 'Good' : qualityScore >= 50 ? 'Moderate' : 'Needs Improvement'}
              </span>
            </div>
          </div>

          {/* Duplicates Section */}
          {duplicates.totalDuplicateRows > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5 text-orange-600" />
                  <h4 className="font-bold text-orange-800">Duplicates Detected</h4>
                </div>
                {onRemoveDuplicates && (
                  <button
                    onClick={onRemoveDuplicates}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Duplicates
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="text-sm text-slate-500 mb-1">Duplicate Phones</div>
                  <div className="text-2xl font-bold text-slate-800">{duplicates.phones.length}</div>
                  {duplicates.phones.slice(0, 3).map((dup, i) => (
                    <div key={i} className="text-xs text-slate-500 mt-1 font-mono truncate">
                      {dup.value} × {dup.count}
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="text-sm text-slate-500 mb-1">Duplicate Emails</div>
                  <div className="text-2xl font-bold text-slate-800">{duplicates.emails.length}</div>
                  {duplicates.emails.slice(0, 3).map((dup, i) => (
                    <div key={i} className="text-xs text-slate-500 mt-1 font-mono truncate">
                      {dup.value} × {dup.count}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 text-sm text-orange-700">
                Total redundant rows: <strong>{duplicates.totalDuplicateRows}</strong>
              </div>
            </div>
          )}

          {/* Errors Section */}
          {(totalPhoneErrors > 0 || totalEmailErrors > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-bold text-red-800">Error Breakdown</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone Errors */}
                {errors.phone.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-red-100">
                    <div className="text-sm font-medium text-slate-700 mb-3">Phone Errors ({totalPhoneErrors})</div>
                    <div className="space-y-2">
                      {errors.phone.map((err, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{getErrorTypeIcon(err.type)}</span>
                            <span className="text-slate-600">{getErrorTypeLabel(err.type)}</span>
                          </span>
                          <span className="font-mono font-bold text-red-600">{err.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Errors */}
                {errors.email.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-red-100">
                    <div className="text-sm font-medium text-slate-700 mb-3">Email Errors ({totalEmailErrors})</div>
                    <div className="space-y-2">
                      {errors.email.map((err, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{getErrorTypeIcon(err.type)}</span>
                            <span className="text-slate-600">{getErrorTypeLabel(err.type)}</span>
                          </span>
                          <span className="font-mono font-bold text-red-600">{err.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-blue-800">Recommendations</h4>
            </div>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
