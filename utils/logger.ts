/**
 * Logger Utility for CSV Healer
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Maximum entries limit (prevents memory bloat)
 * - LocalStorage persistence
 * - Export functionality
 * - Automatic cleanup of old logs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface LoggerConfig {
  maxEntries: number;           // Max logs to keep in memory
  persistToStorage: boolean;    // Save to LocalStorage
  storageKey: string;           // LocalStorage key
  minLevel: LogLevel;           // Minimum level to log
  enabled: boolean;             // Enable/disable logging
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const DEFAULT_CONFIG: LoggerConfig = {
  maxEntries: 500,              // Keep last 500 logs
  persistToStorage: true,
  storageKey: 'csv_healer_logs',
  minLevel: 'info',
  enabled: true
};

class Logger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private truncateData(data: Record<string, unknown>): Record<string, unknown> {
    const truncated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 200) {
        truncated[key] = value.substring(0, 200) + '...[truncated]';
      } else if (Array.isArray(value) && value.length > 10) {
        truncated[key] = [...value.slice(0, 10), `...(${value.length - 10} more)`];
      } else if (typeof value === 'object' && value !== null) {
        const str = JSON.stringify(value);
        if (str.length > 500) {
          truncated[key] = '[Object too large]';
        } else {
          truncated[key] = value;
        }
      } else {
        truncated[key] = value;
      }
    }

    return truncated;
  }

  private enforceLimit(): void {
    if (this.logs.length > this.config.maxEntries) {
      // Keep only the most recent logs
      const excess = this.logs.length - this.config.maxEntries;
      this.logs = this.logs.slice(excess);
    }
  }

  private saveToStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      // Only save last 100 logs to storage to prevent quota issues
      const logsToSave = this.logs.slice(-100);
      localStorage.setItem(this.config.storageKey, JSON.stringify(logsToSave));
    } catch (e) {
      // Storage full - clear old logs
      console.warn('Logger: Storage full, clearing old logs');
      localStorage.removeItem(this.config.storageKey);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        }
      }
    } catch (e) {
      console.warn('Logger: Failed to load logs from storage');
    }
  }

  private addLog(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data: data ? this.truncateData(data) : undefined
    };

    this.logs.push(entry);
    this.enforceLimit();
    this.saveToStorage();

    // Also output to console in development
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] [${category}] ${message}`, data || '');
  }

  // Public logging methods
  debug(category: string, message: string, data?: Record<string, unknown>): void {
    this.addLog('debug', category, message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>): void {
    this.addLog('info', category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    this.addLog('warn', category, message, data);
  }

  error(category: string, message: string, data?: Record<string, unknown>): void {
    this.addLog('error', category, message, data);
  }

  // Utility methods
  getLogs(filter?: { level?: LogLevel; category?: string; limit?: number }): LogEntry[] {
    let result = [...this.logs];

    if (filter?.level) {
      result = result.filter(log => log.level === filter.level);
    }

    if (filter?.category) {
      result = result.filter(log => log.category === filter.category);
    }

    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  getSessionLogs(): LogEntry[] {
    // Only logs from current session (by timestamp proximity)
    const sessionStart = parseInt(this.sessionId.split('_')[1]);
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= sessionStart;
    });
  }

  clearLogs(): void {
    this.logs = [];
    if (this.config.persistToStorage) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  exportLogsAsText(): string {
    return this.logs.map(log => {
      const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
      return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  getStats(): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<string, number> } {
    const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    const byCategory: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel,
      byCategory
    };
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports for common categories
export const logParsing = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug('PARSING', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info('PARSING', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn('PARSING', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error('PARSING', msg, data),
};

export const logProcessing = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug('PROCESSING', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info('PROCESSING', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn('PROCESSING', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error('PROCESSING', msg, data),
};

export const logAI = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug('AI', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info('AI', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn('AI', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error('AI', msg, data),
};

export const logExport = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug('EXPORT', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info('EXPORT', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn('EXPORT', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error('EXPORT', msg, data),
};

export const logUI = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug('UI', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info('UI', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn('UI', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error('UI', msg, data),
};
