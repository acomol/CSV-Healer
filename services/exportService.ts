/**
 * Export Service for CSV Healer
 * Supports multiple export formats: CSV, JSON, XLSX (via simple format)
 */

import { CsvRow } from "../types";
import { DataQualityReport } from "../utils/csvHelper";
import { logExport } from "../utils/logger";

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  columns?: string[];  // Specific columns to export
  encoding?: 'utf-8' | 'utf-16';
}

declare const Papa: any;

/**
 * Export data to CSV format
 */
const exportToCsv = (data: CsvRow[], options: ExportOptions): string => {
  logExport.info('Exporting to CSV', { rows: data.length });

  const columns = options.columns || (data.length > 0 ? Object.keys(data[0]) : []);

  // Filter data to only include specified columns
  const filteredData = data.map(row => {
    const newRow: CsvRow = {};
    columns.forEach(col => {
      newRow[col] = row[col] || '';
    });
    return newRow;
  });

  // Use PapaParse if available, otherwise manual CSV generation
  if (typeof Papa !== 'undefined') {
    return Papa.unparse(filteredData);
  }

  // Manual CSV generation fallback
  const header = columns.join(',');
  const rows = filteredData.map(row =>
    columns.map(col => {
      const value = row[col] || '';
      // Escape quotes and wrap in quotes if contains comma or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return options.includeHeaders !== false ? [header, ...rows].join('\n') : rows.join('\n');
};

/**
 * Export data to JSON format
 */
const exportToJson = (data: CsvRow[], options: ExportOptions): string => {
  logExport.info('Exporting to JSON', { rows: data.length });

  const columns = options.columns;

  if (columns) {
    const filteredData = data.map(row => {
      const newRow: CsvRow = {};
      columns.forEach(col => {
        newRow[col] = row[col] || '';
      });
      return newRow;
    });
    return JSON.stringify(filteredData, null, 2);
  }

  return JSON.stringify(data, null, 2);
};

/**
 * Export data to simple XLSX format (actually TSV for Excel compatibility)
 * For true XLSX, a library like xlsx would be needed
 */
const exportToXlsx = (data: CsvRow[], options: ExportOptions): string => {
  logExport.info('Exporting to XLSX (TSV)', { rows: data.length });

  const columns = options.columns || (data.length > 0 ? Object.keys(data[0]) : []);

  // Use tab-separated values for Excel compatibility
  const header = columns.join('\t');
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col] || '';
      // Replace tabs and newlines with spaces
      return value.replace(/[\t\n\r]/g, ' ');
    }).join('\t')
  );

  return options.includeHeaders !== false ? [header, ...rows].join('\n') : rows.join('\n');
};

/**
 * Export quality report to text format
 */
const exportReportToTxt = (
  data: CsvRow[],
  report: DataQualityReport,
  phoneCol: string | null,
  emailCol: string | null
): string => {
  logExport.info('Exporting quality report to TXT');

  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    '           CSV HEALER - DATA QUALITY REPORT',
    '═══════════════════════════════════════════════════════════',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total Rows: ${data.length}`,
    '',
    '───────────────────────────────────────────────────────────',
    '                    QUALITY SCORE',
    '───────────────────────────────────────────────────────────',
    '',
    `  Score: ${report.qualityScore}/100 ${report.qualityScore >= 80 ? '✓ Good' : report.qualityScore >= 50 ? '⚠ Moderate' : '✗ Poor'}`,
    '',
    '───────────────────────────────────────────────────────────',
    '                  COLUMN DETECTION',
    '───────────────────────────────────────────────────────────',
    '',
    `  Phone Column: ${phoneCol || 'Not detected'}`,
    `  Email Column: ${emailCol || 'Not detected'}`,
    '',
    '───────────────────────────────────────────────────────────',
    '                    DUPLICATES',
    '───────────────────────────────────────────────────────────',
    '',
    `  Total Duplicate Rows: ${report.duplicates.totalDuplicateRows}`,
    `  Unique Phone Duplicates: ${report.duplicates.phones.length}`,
    `  Unique Email Duplicates: ${report.duplicates.emails.length}`,
    ''
  ];

  if (report.duplicates.phones.length > 0) {
    lines.push('  Top Duplicate Phones:');
    report.duplicates.phones.slice(0, 5).forEach((dup, i) => {
      lines.push(`    ${i + 1}. ${dup.value} (×${dup.count})`);
    });
    lines.push('');
  }

  lines.push(
    '───────────────────────────────────────────────────────────',
    '                     ERRORS',
    '───────────────────────────────────────────────────────────',
    ''
  );

  if (report.errors.phone.length > 0) {
    lines.push('  Phone Errors:');
    report.errors.phone.forEach(err => {
      lines.push(`    • ${err.type}: ${err.count}`);
      if (err.examples.length > 0) {
        lines.push(`      Examples: ${err.examples.map(e => e.value).join(', ')}`);
      }
    });
    lines.push('');
  }

  if (report.errors.email.length > 0) {
    lines.push('  Email Errors:');
    report.errors.email.forEach(err => {
      lines.push(`    • ${err.type}: ${err.count}`);
      if (err.examples.length > 0) {
        lines.push(`      Examples: ${err.examples.map(e => e.value).join(', ')}`);
      }
    });
    lines.push('');
  }

  lines.push(
    '───────────────────────────────────────────────────────────',
    '                 RECOMMENDATIONS',
    '───────────────────────────────────────────────────────────',
    ''
  );

  report.recommendations.forEach((rec, i) => {
    lines.push(`  ${i + 1}. ${rec}`);
  });

  lines.push(
    '',
    '═══════════════════════════════════════════════════════════',
    '                    END OF REPORT',
    '═══════════════════════════════════════════════════════════'
  );

  return lines.join('\n');
};

/**
 * Main export function
 */
export const exportData = (
  data: CsvRow[],
  options: ExportOptions
): { content: string; mimeType: string; extension: string } => {
  logExport.info('Export requested', { format: options.format, rows: data.length });

  let content: string;
  let mimeType: string;
  let extension: string;

  switch (options.format) {
    case 'csv':
      content = exportToCsv(data, options);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
      break;

    case 'json':
      content = exportToJson(data, options);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
      break;

    case 'xlsx':
      content = exportToXlsx(data, options);
      mimeType = 'text/tab-separated-values;charset=utf-8;';
      extension = 'tsv'; // Actually TSV for Excel compatibility
      break;

    case 'txt':
      content = exportToCsv(data, options); // Use CSV for txt
      mimeType = 'text/plain;charset=utf-8;';
      extension = 'txt';
      break;

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  logExport.info('Export completed', { format: options.format, size: content.length });

  return { content, mimeType, extension };
};

/**
 * Export quality report
 */
export const exportQualityReport = (
  data: CsvRow[],
  report: DataQualityReport,
  phoneCol: string | null,
  emailCol: string | null,
  format: 'txt' | 'json' = 'txt'
): { content: string; mimeType: string; extension: string } => {
  logExport.info('Exporting quality report', { format });

  if (format === 'json') {
    return {
      content: JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalRows: data.length,
        detectedColumns: { phone: phoneCol, email: emailCol },
        ...report
      }, null, 2),
      mimeType: 'application/json;charset=utf-8;',
      extension: 'json'
    };
  }

  return {
    content: exportReportToTxt(data, report, phoneCol, emailCol),
    mimeType: 'text/plain;charset=utf-8;',
    extension: 'txt'
  };
};

/**
 * Trigger file download in browser
 */
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  logExport.info('Triggering download', { filename });

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logExport.info('Download triggered successfully');
};

/**
 * Export for Meta Ads (optimized CSV)
 */
export const exportForMetaAds = (
  data: CsvRow[],
  phoneCol: string | null,
  emailCol: string | null,
  filename: string = 'meta_audience'
): void => {
  logExport.info('Exporting for Meta Ads', { rows: data.length, phoneCol, emailCol });

  // Only export phone and email columns for Meta
  const columns: string[] = [];
  if (phoneCol) columns.push(phoneCol);
  if (emailCol) columns.push(emailCol);

  if (columns.length === 0) {
    logExport.warn('No phone or email columns to export');
    return;
  }

  const { content, mimeType } = exportData(data, {
    format: 'csv',
    columns,
    includeHeaders: true
  });

  downloadFile(content, `${filename}.csv`, mimeType);
};
