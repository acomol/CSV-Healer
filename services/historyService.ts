/**
 * File History Service for CSV Healer
 * Tracks processed files in LocalStorage with size limits
 */

import { FbStats } from "../types";
import { logUI } from "../utils/logger";

export interface FileHistoryEntry {
  id: string;
  filename: string;
  processedAt: string;
  rowCount: number;
  qualityScore: number;
  stats: {
    validPhones: number;
    validEmails: number;
    fixedPhones: number;
    duplicatesRemoved?: number;
  };
  columns: {
    phone: string | null;
    email: string | null;
  };
}

export interface HistoryConfig {
  maxEntries: number;
  storageKey: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: HistoryConfig = {
  maxEntries: 20,  // Keep last 20 files
  storageKey: 'csv_healer_history',
  enabled: true
};

class HistoryService {
  private config: HistoryConfig;
  private history: FileHistoryEntry[] = [];

  constructor(config: Partial<HistoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private loadFromStorage(): void {
    if (!this.config.enabled) return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.history = parsed;
          logUI.debug('History loaded from storage', { count: this.history.length });
        }
      }
    } catch (e) {
      logUI.warn('Failed to load history from storage', { error: String(e) });
    }
  }

  private saveToStorage(): void {
    if (!this.config.enabled) return;

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.history));
    } catch (e) {
      logUI.warn('Failed to save history to storage', { error: String(e) });
      // Storage full - remove oldest entries
      this.history = this.history.slice(-10);
      try {
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.history));
      } catch {
        logUI.error('Storage critically full, clearing history');
        localStorage.removeItem(this.config.storageKey);
      }
    }
  }

  private enforceLimit(): void {
    if (this.history.length > this.config.maxEntries) {
      this.history = this.history.slice(-this.config.maxEntries);
    }
  }

  /**
   * Add a new file to history
   */
  addEntry(
    filename: string,
    rowCount: number,
    qualityScore: number,
    stats: FbStats,
    columns: { phone: string | null; email: string | null },
    duplicatesRemoved?: number
  ): FileHistoryEntry {
    logUI.info('Adding file to history', { filename, rowCount });

    const entry: FileHistoryEntry = {
      id: this.generateId(),
      filename,
      processedAt: new Date().toISOString(),
      rowCount,
      qualityScore,
      stats: {
        validPhones: stats.validPhones,
        validEmails: stats.validEmails,
        fixedPhones: stats.fixedPhones,
        duplicatesRemoved
      },
      columns
    };

    this.history.push(entry);
    this.enforceLimit();
    this.saveToStorage();

    return entry;
  }

  /**
   * Get all history entries
   */
  getHistory(): FileHistoryEntry[] {
    return [...this.history].reverse(); // Most recent first
  }

  /**
   * Get recent history entries
   */
  getRecentHistory(limit: number = 5): FileHistoryEntry[] {
    return this.getHistory().slice(0, limit);
  }

  /**
   * Find entry by filename
   */
  findByFilename(filename: string): FileHistoryEntry | undefined {
    return this.history.find(entry => entry.filename === filename);
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): FileHistoryEntry | undefined {
    return this.history.find(entry => entry.id === id);
  }

  /**
   * Delete entry
   */
  deleteEntry(id: string): boolean {
    const index = this.history.findIndex(entry => entry.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      this.saveToStorage();
      logUI.info('History entry deleted', { id });
      return true;
    }
    return false;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    localStorage.removeItem(this.config.storageKey);
    logUI.info('History cleared');
  }

  /**
   * Get statistics about processed files
   */
  getStats(): {
    totalFiles: number;
    totalRows: number;
    avgQualityScore: number;
    totalDuplicatesRemoved: number;
  } {
    const totalFiles = this.history.length;
    const totalRows = this.history.reduce((sum, e) => sum + e.rowCount, 0);
    const avgQualityScore = totalFiles > 0
      ? Math.round(this.history.reduce((sum, e) => sum + e.qualityScore, 0) / totalFiles)
      : 0;
    const totalDuplicatesRemoved = this.history.reduce(
      (sum, e) => sum + (e.stats.duplicatesRemoved || 0), 0
    );

    return { totalFiles, totalRows, avgQualityScore, totalDuplicatesRemoved };
  }

  /**
   * Check if a similar file was processed recently
   */
  wasRecentlyProcessed(filename: string, withinHours: number = 24): boolean {
    const cutoff = Date.now() - (withinHours * 60 * 60 * 1000);
    return this.history.some(entry =>
      entry.filename === filename &&
      new Date(entry.processedAt).getTime() > cutoff
    );
  }

  /**
   * Export history as JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.history = [...this.history, ...imported];
        this.enforceLimit();
        this.saveToStorage();
        logUI.info('History imported', { count: imported.length });
        return true;
      }
    } catch (e) {
      logUI.error('Failed to import history', { error: String(e) });
    }
    return false;
  }
}

// Singleton instance
export const historyService = new HistoryService();
