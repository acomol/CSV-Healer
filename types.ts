export interface CsvRow {
  [key: string]: string;
}

export interface ParseResult {
  data: CsvRow[];
  meta: {
    fields?: string[];
  };
  errors: any[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ColumnStats {
  field: string;
  hasFormulas: number;
  empty: number;
  total: number;
}

export interface FbStats {
  totalRows: number;
  validPhones: number;
  fixedPhones: number;
  invalidPhones: number;
  validEmails: number;
  fixedEmails: number; // Added to track emails converted to lowercase
  matchRateEstimate: string;
}