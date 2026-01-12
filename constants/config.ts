/**
 * Configuration Constants for CSV Healer
 *
 * This file centralizes all magic numbers and configuration values
 * extracted from across the codebase for maintainability and consistency.
 */

// ============================================
// CSV PARSING CONFIGURATION
// From: utils/csvHelper.ts
// ============================================

/** Number of rows to scan for automatic column detection */
export const SCAN_ROWS_LIMIT = 50 as const;

/** Minimum score threshold for valid phone column detection */
export const MIN_PHONE_SCORE = 3 as const;

/** Minimum score threshold for valid email column detection */
export const MIN_EMAIL_SCORE = 3 as const;

// ============================================
// FILE UPLOAD CONFIGURATION
// From: components/DropZone.tsx
// ============================================

/** Maximum file size allowed for upload (in megabytes) */
export const MAX_FILE_SIZE_MB = 50 as const;

/** Maximum file size in bytes (calculated from MB) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// ============================================
// FILE HISTORY CONFIGURATION
// From: services/historyService.ts
// ============================================

/** Maximum number of file history entries to retain */
export const HISTORY_MAX_ENTRIES = 20 as const;

/** LocalStorage key for file history persistence */
export const HISTORY_STORAGE_KEY = 'csv_healer_history' as const;

// ============================================
// LOGGING CONFIGURATION
// From: utils/logger.ts
// ============================================

/** Maximum number of log entries to keep in memory */
export const LOG_MAX_ENTRIES = 500 as const;

/** LocalStorage key for log persistence */
export const LOG_STORAGE_KEY = 'csv_healer_logs' as const;

/** Maximum logs to persist to LocalStorage (subset of memory logs) */
export const LOG_STORAGE_LIMIT = 100 as const;

// ============================================
// PHONE FORMAT CONFIGURATION
// From: services/platformService.ts
// ============================================

/** Minimum digits required for a valid phone number */
export const PHONE_MIN_DIGITS = 10 as const;

/** Maximum digits allowed for a valid phone number */
export const PHONE_MAX_DIGITS = 15 as const;

/** Default country code for phone normalization (Israel) */
export const DEFAULT_COUNTRY_CODE = '972' as const;

/** Phone format configuration object */
export const PHONE_FORMAT_CONFIG = {
  minDigits: PHONE_MIN_DIGITS,
  maxDigits: PHONE_MAX_DIGITS,
  defaultCountryCode: DEFAULT_COUNTRY_CODE,
} as const;

// ============================================
// PLATFORM-SPECIFIC CONFIGURATION
// From: services/platformService.ts
// ============================================

/** Google Ads minimum rows required for Customer Match upload */
export const GOOGLE_ADS_MIN_ROWS = 100 as const;

/** Google Ads recommended rows for optimal matching performance */
export const GOOGLE_ADS_RECOMMENDED_ROWS = 1000 as const;

/** Meta Ads minimum rows required (flexible, supports single row) */
export const META_ADS_MIN_ROWS = 1 as const;

/** Platform minimum row requirements */
export const PLATFORM_MIN_ROWS = {
  meta: META_ADS_MIN_ROWS,
  google: GOOGLE_ADS_MIN_ROWS,
} as const;

// ============================================
// AI/API CONFIGURATION
// From: services/geminiService.ts
// ============================================

/** AI model identifier for Gemini API calls */
export const AI_MODEL = 'gemini-2.0-flash' as const;

/** Maximum API requests per minute (rate limiting) */
export const API_RATE_LIMIT = 10 as const;

/** Number of sample rows to use for AI audit analysis */
export const AI_AUDIT_SAMPLE_SIZE = 10 as const;

/** Number of sample rows for random sampling in enhanced audit */
export const AI_RANDOM_SAMPLE_SIZE = 5 as const;

// ============================================
// DATA QUALITY CONFIGURATION
// ============================================

/** Maximum examples to show per error category in quality reports */
export const MAX_ERROR_EXAMPLES = 3 as const;

/** Top N duplicates to display in quality reports */
export const MAX_DUPLICATE_DISPLAY = 10 as const;

/** Quality score thresholds for data assessment */
export const QUALITY_SCORE_THRESHOLDS = {
  /** Score at or above this is considered good quality */
  good: 80,
  /** Score at or above this is considered moderate quality */
  moderate: 50,
  /** Score below moderate is considered poor quality */
} as const;

// ============================================
// VALIDATION PATTERNS (Regex)
// From: utils/csvHelper.ts
// ============================================

/** Pattern to match Excel formula artifacts (e.g., ="0501234567") */
export const EXCEL_FORMULA_PATTERN = /^="?(\+?[\dE,\.]+)"?$/;

/** Pattern to validate email format */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pattern to identify phone-like values (digits with optional formatting) */
export const PHONE_VALUE_PATTERN = /^[\d\s\-\(\)\+\.="]+$/;

// ============================================
// TYPE DEFINITIONS FOR CONFIGURATION
// ============================================

/** Configuration object for CSV parsing */
export interface CsvParsingConfig {
  scanRowsLimit: number;
  minPhoneScore: number;
  minEmailScore: number;
}

/** Configuration object for file upload */
export interface FileUploadConfig {
  maxFileSizeMb: number;
  maxFileSizeBytes: number;
}

/** Configuration object for history service */
export interface HistoryConfig {
  maxEntries: number;
  storageKey: string;
}

/** Configuration object for logger */
export interface LoggerConfig {
  maxEntries: number;
  storageKey: string;
  storageLimit: number;
}

/** Configuration object for phone formatting */
export interface PhoneFormatConfig {
  minDigits: number;
  maxDigits: number;
  defaultCountryCode: string;
}

/** Configuration object for AI/API settings */
export interface ApiConfig {
  model: string;
  rateLimit: number;
  auditSampleSize: number;
  randomSampleSize: number;
}

// ============================================
// BUNDLED CONFIGURATION OBJECTS
// ============================================

/** All CSV parsing related configuration */
export const CSV_PARSING_CONFIG: CsvParsingConfig = {
  scanRowsLimit: SCAN_ROWS_LIMIT,
  minPhoneScore: MIN_PHONE_SCORE,
  minEmailScore: MIN_EMAIL_SCORE,
} as const;

/** All file upload related configuration */
export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
  maxFileSizeMb: MAX_FILE_SIZE_MB,
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
} as const;

/** All history service configuration */
export const HISTORY_SERVICE_CONFIG: HistoryConfig = {
  maxEntries: HISTORY_MAX_ENTRIES,
  storageKey: HISTORY_STORAGE_KEY,
} as const;

/** All logger configuration */
export const LOGGER_CONFIG: LoggerConfig = {
  maxEntries: LOG_MAX_ENTRIES,
  storageKey: LOG_STORAGE_KEY,
  storageLimit: LOG_STORAGE_LIMIT,
} as const;

/** All AI/API configuration */
export const API_CONFIG: ApiConfig = {
  model: AI_MODEL,
  rateLimit: API_RATE_LIMIT,
  auditSampleSize: AI_AUDIT_SAMPLE_SIZE,
  randomSampleSize: AI_RANDOM_SAMPLE_SIZE,
} as const;
