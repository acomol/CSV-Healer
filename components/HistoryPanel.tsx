import React, { useState, useEffect } from 'react';
import { Clock, Trash2, FileText, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { historyService, FileHistoryEntry } from '../services/historyService';

interface HistoryPanelProps {
  onRefresh?: () => void;
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBadge = (score: number): { bg: string; text: string } => {
  if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700' };
  if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
  return { bg: 'bg-red-100', text: 'text-red-700' };
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onRefresh }) => {
  const [history, setHistory] = useState<FileHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [stats, setStats] = useState<ReturnType<typeof historyService.getStats> | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const entries = historyService.getRecentHistory(5);
    setHistory(entries);
    setStats(historyService.getStats());
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this file from history?')) {
      historyService.deleteEntry(id);
      loadHistory();
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all file history? This cannot be undone.')) {
      historyService.clearHistory();
      loadHistory();
    }
  };

  if (history.length === 0) {
    return null; // Don't show panel if no history
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Recent Files</span>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {/* Stats Summary */}
          {stats && stats.totalFiles > 1 && (
            <div className="px-4 py-2 bg-slate-50/50 flex gap-4 text-xs text-slate-500">
              <span>Total: <strong>{stats.totalFiles}</strong> files</span>
              <span>Rows: <strong>{stats.totalRows.toLocaleString()}</strong></span>
              <span>Avg Score: <strong className={getScoreColor(stats.avgQualityScore)}>{stats.avgQualityScore}</strong></span>
            </div>
          )}

          {/* History List */}
          {history.map((entry) => {
            const badge = getScoreBadge(entry.qualityScore);
            return (
              <div
                key={entry.id}
                className="px-4 py-3 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {entry.filename}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-500">
                          {entry.rowCount.toLocaleString()} rows
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                          {entry.qualityScore}/100
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(entry.processedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {entry.stats.validPhones > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {entry.stats.validPhones} phones
                          </span>
                        )}
                        {entry.stats.validEmails > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-blue-500" />
                            {entry.stats.validEmails} emails
                          </span>
                        )}
                        {entry.stats.fixedPhones > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            {entry.stats.fixedPhones} fixed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          {history.length > 0 && (
            <div className="px-4 py-2 bg-slate-50/50 flex justify-end">
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
