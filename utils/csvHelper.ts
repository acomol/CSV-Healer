import { CsvRow, FbStats } from "../types";

// Regex to identify Excel formula artifacts
const EXCEL_FORMULA_REGEX = /^="?(\+?[\dE,\.]+)"?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s\-\(\)\+\.="]+$/;

// Number of rows to scan for column detection
const SCAN_ROWS_LIMIT = 50;

// Minimum score threshold for valid column detection
const MIN_PHONE_SCORE = 3;
const MIN_EMAIL_SCORE = 3;

/**
 * Smart Header Detection
 * Checks if the first row contains actual data (email/phone patterns) or headers
 * Returns true if the row appears to be a header row, false if it's data
 */
export const detectIfHeaderRow = (row: CsvRow): boolean => {
  const values = Object.values(row);
  const keys = Object.keys(row);

  let dataPatternCount = 0;
  let headerPatternCount = 0;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const key = keys[i];

    if (!val || typeof val !== 'string') continue;

    const trimmed = val.trim().toLowerCase();

    // Check for data patterns (emails, phones)
    if (EMAIL_REGEX.test(trimmed)) {
      dataPatternCount += 2; // Strong indicator of data row
    }

    // Phone pattern: mostly digits, possibly with formatting
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 15) {
      // Has phone-like digit count
      if (PHONE_PATTERN.test(val) || val.startsWith('=')) {
        dataPatternCount += 2;
      }
    }

    // Check for header patterns (common header keywords)
    const headerKeywords = [
      'phone', 'mobile', 'cell', 'tel', 'telephone',
      'email', 'mail', 'e-mail',
      'name', 'first', 'last', 'fname', 'lname',
      'address', 'city', 'country', 'zip', 'postal',
      'id', 'number', 'num', '#'
    ];

    for (const keyword of headerKeywords) {
      if (trimmed.includes(keyword) || key.toLowerCase().includes(keyword)) {
        headerPatternCount++;
        break;
      }
    }

    // Purely alphabetic short strings are likely headers
    if (/^[a-z_\s]+$/.test(trimmed) && trimmed.length < 30 && !trimmed.includes('@')) {
      headerPatternCount += 0.5;
    }
  }

  // If we find strong data patterns (emails/phones), it's likely NOT a header row
  // Return true only if it looks like a header row
  return dataPatternCount < headerPatternCount;
};

/**
 * Generate auto headers when file has no headers
 */
export const generateAutoHeaders = (columnCount: number): string[] => {
  return Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
};

/**
 * Detect Phone Column - scans up to 50 rows for accurate detection
 */
export const detectPhoneColumn = (data: CsvRow[]): string | null => {
  if (data.length === 0) return null;

  const columnScores: Record<string, number> = {};
  const rowsToScan = Math.min(data.length, SCAN_ROWS_LIMIT);

  // Initialize scores for all columns
  Object.keys(data[0]).forEach(key => {
    columnScores[key] = 0;

    // Header keyword boost (applied once per column)
    const headerLower = key.toLowerCase();
    if (headerLower.includes('phone') || headerLower.includes('mobile') ||
        headerLower.includes('cell') || headerLower.includes('tel')) {
      columnScores[key] += 10;
    }
  });

  // Scan multiple rows and accumulate scores
  for (let i = 0; i < rowsToScan; i++) {
    const row = data[i];

    Object.keys(row).forEach(key => {
      const val = row[key];
      if (!val || typeof val !== 'string') return;

      const clean = val.replace(/[^0-9]/g, '');

      // Content analysis per row
      if (clean.length >= 9 && clean.length <= 15) {
        columnScores[key] += 2;
      }

      // Excel formula artifacts (high likelihood of phone data)
      if (val.includes('=') && val.includes('"')) {
        columnScores[key] += 3;
      }

      // Israeli phone patterns
      if (val.startsWith('05') || clean.startsWith('05') ||
          val.startsWith('5') || clean.startsWith('5') ||
          clean.startsWith('972')) {
        columnScores[key] += 2;
      }

      // Scientific notation (corrupted phone)
      if (val.includes('E+') || val.includes('e+')) {
        columnScores[key] += 1;
      }
    });
  }

  // Find column with highest score
  let bestMatch: string | null = null;
  let maxScore = 0;

  Object.entries(columnScores).forEach(([key, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestMatch = key;
    }
  });

  // Only return if score meets minimum threshold
  return maxScore >= MIN_PHONE_SCORE ? bestMatch : null;
};

/**
 * Detect Email Column - scans up to 50 rows for accurate detection
 */
export const detectEmailColumn = (data: CsvRow[]): string | null => {
  if (data.length === 0) return null;

  const columnScores: Record<string, number> = {};
  const rowsToScan = Math.min(data.length, SCAN_ROWS_LIMIT);

  // Initialize scores for all columns
  Object.keys(data[0]).forEach(key => {
    columnScores[key] = 0;

    // Header keyword boost (applied once per column)
    const headerLower = key.toLowerCase();
    if (headerLower.includes('email') || headerLower.includes('mail') ||
        headerLower.includes('e-mail')) {
      columnScores[key] += 10;
    }
  });

  // Scan multiple rows and accumulate scores
  for (let i = 0; i < rowsToScan; i++) {
    const row = data[i];

    Object.keys(row).forEach(key => {
      const val = row[key];
      if (!val || typeof val !== 'string') return;

      // Email pattern detection
      if (val.includes('@') && val.includes('.')) {
        columnScores[key] += 3;

        // Extra points for valid email format
        if (EMAIL_REGEX.test(val.trim().toLowerCase())) {
          columnScores[key] += 2;
        }
      }
    });
  }

  // Find column with highest score
  let bestMatch: string | null = null;
  let maxScore = 0;

  Object.entries(columnScores).forEach(([key, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestMatch = key;
    }
  });

  // Only return if score meets minimum threshold
  return maxScore >= MIN_EMAIL_SCORE ? bestMatch : null;
};

// Helper: Normalize Email for Facebook
// Rule: "We accept email addresses... All universal email address formats are accepted... Lowercase only."
export const normalizeEmailForFb = (raw: string): { value: string; wasFixed: boolean; isValid: boolean } => {
  if (!raw) return { value: "", wasFixed: false, isValid: false };

  const trimmed = raw.trim();
  const lowercased = trimmed.toLowerCase();
  
  const wasFixed = raw !== lowercased || raw !== trimmed;
  const isValid = EMAIL_REGEX.test(lowercased);

  return { value: lowercased, wasFixed, isValid };
};

// Helper: Normalize Phone for Facebook (Israel Focus)
export const normalizePhoneForFb = (raw: string): { value: string; wasFixed: boolean; isValid: boolean } => {
  if (!raw) return { value: "", wasFixed: false, isValid: false };

  let clean = raw.trim();
  let wasFixed = false;

  // 1. Strip Excel Formulas (e.g., ="050...")
  const formulaMatch = clean.match(EXCEL_FORMULA_REGEX);
  if (formulaMatch || (clean.startsWith('=') && clean.includes('"'))) {
    clean = clean.replace(/[="]/g, '').trim();
    wasFixed = true;
  }

  // 2. Check for Scientific Notation corruption (e.g., 4,47E+11)
  if (clean.includes('E+') || clean.includes('e+')) {
    return { value: raw, wasFixed: false, isValid: false }; // Unrecoverable
  }

  // 3. Remove all non-numeric characters for processing
  // Meta Guideline: "Phone numbers must include a country code... exclude any symbols, letters and any leading zeros."
  let digits = clean.replace(/\D/g, '');

  // 4. Israel Specific Logic
  // Case A: Local Mobile with 0 (e.g., 0501234567) -> 972501234567
  if (digits.startsWith('05') && digits.length === 10) {
    digits = '972' + digits.substring(1);
    wasFixed = true;
  }
  // Case B: Local Mobile missing 0 (e.g., 501234567) -> 972501234567
  else if (digits.startsWith('5') && digits.length === 9) {
    digits = '972' + digits;
    wasFixed = true;
  }
  // Case C: Already Int'l (e.g., 97250...) -> Keep
  else if (digits.startsWith('972') && digits.length === 12) {
    // No change needed usually, but we ensure it's clean
  }
  // Fallback: If it's a raw number but has symbols in original, mark as fixed
  else if (raw !== digits) {
    wasFixed = true;
  }
  
  // Facebook Requirement: Include country code, no + sign, no formatting.
  const isValid = digits.length >= 10 && digits.length <= 15;

  return { value: digits, wasFixed, isValid };
};

export const detectFormulaErrors = (data: CsvRow[]): number => {
  let errorCount = 0;
  data.forEach(row => {
    Object.values(row).forEach(val => {
      if (typeof val === 'string' && (val.startsWith('=') || val.includes('E+'))) {
        errorCount++;
      }
    });
  });
  return errorCount;
};

export const calculateStats = (data: CsvRow[], phoneCol: string, emailCol: string | null): FbStats => {
  let validPhones = 0;
  let fixedPhones = 0;
  let invalidPhones = 0;
  let validEmails = 0;
  let fixedEmails = 0;

  data.forEach(row => {
    // Phone Stats
    if (phoneCol && row[phoneCol]) {
      const { isValid, wasFixed } = normalizePhoneForFb(row[phoneCol]);
      if (isValid) {
        validPhones++;
        if (wasFixed) fixedPhones++;
      } else {
        invalidPhones++;
      }
    } else {
      invalidPhones++;
    }

    // Email Stats
    if (emailCol && row[emailCol]) {
      const { isValid, wasFixed } = normalizeEmailForFb(row[emailCol]);
      if (isValid) validEmails++;
      if (wasFixed) fixedEmails++;
    }
  });

  // Weighted match rate: Phones are usually 60% of match quality, Emails 40%
  const phoneRate = validPhones / data.length;
  const emailRate = emailCol ? (validEmails / data.length) : 0;
  
  // If both exist, average them. If only phone, use phone.
  const weightedRate = emailCol ? (phoneRate + emailRate) / 2 : phoneRate;
  const matchRate = Math.round(weightedRate * 100);

  return {
    totalRows: data.length,
    validPhones,
    fixedPhones,
    invalidPhones,
    validEmails,
    fixedEmails,
    matchRateEstimate: `${matchRate}%`
  };
};

export const processCsvData = (data: CsvRow[]): { cleaned: CsvRow[], stats: FbStats, phoneCol: string | null, emailCol: string | null } => {
  if (data.length === 0) return { cleaned: [], stats: {} as FbStats, phoneCol: null, emailCol: null };

  // 1. Detect Columns using multi-row scanning (up to 50 rows)
  const phoneCol = detectPhoneColumn(data);
  const emailCol = detectEmailColumn(data);

  const cleaned = data.map(row => {
    const newRow: CsvRow = { ...row };

    // Normalize Phone
    if (phoneCol && row[phoneCol]) {
      const { value } = normalizePhoneForFb(row[phoneCol]);
      newRow[phoneCol] = value;
    }

    // Normalize Email (Lowercase required by FB)
    if (emailCol && row[emailCol]) {
      const { value } = normalizeEmailForFb(row[emailCol]);
      newRow[emailCol] = value;
    }

    return newRow;
  });

  const stats = calculateStats(data, phoneCol || '', emailCol);

  return { cleaned, stats, phoneCol, emailCol };
};