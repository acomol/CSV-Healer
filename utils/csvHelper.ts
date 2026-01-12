import { CsvRow, FbStats } from "../types";

// Regex to identify Excel formula artifacts
const EXCEL_FORMULA_REGEX = /^="?(\+?[\dE,\.]+)"?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: Detect Phone Column
export const detectPhoneColumn = (row: CsvRow): string | null => {
  let bestMatch = null;
  let maxScore = 0;

  Object.keys(row).forEach(key => {
    const val = row[key];
    if (!val) return;
    
    let score = 0;
    const clean = val.replace(/[^0-9]/g, '');
    
    // Header keyword boost
    const headerLower = key.toLowerCase();
    if (headerLower.includes('phone') || headerLower.includes('mobile') || headerLower.includes('cell')) score += 5;

    // Content analysis
    if (clean.length >= 9 && clean.length <= 15) score += 2;
    if (val.includes('=') && val.includes('"')) score += 3; // High likelihood it's the broken excel column
    if (val.startsWith('05') || val.startsWith('5')) score += 1;
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = key;
    }
  });

  return bestMatch;
};

// Helper: Detect Email Column
export const detectEmailColumn = (row: CsvRow): string | null => {
  let bestMatch = null;
  let maxScore = 0;

  Object.keys(row).forEach(key => {
    const val = row[key];
    if (!val) return;

    let score = 0;
    // Header keyword boost
    if (key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')) score += 5;
    
    // Content analysis
    if (val.includes('@') && val.includes('.')) score += 3;
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = key;
    }
  });

  return bestMatch;
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

export const processCsvData = (data: CsvRow[]): { cleaned: CsvRow[], stats: FbStats } => {
  if (data.length === 0) return { cleaned: [], stats: {} as FbStats };

  // 1. Detect Columns
  const phoneCol = detectPhoneColumn(data[0]) || Object.keys(data[0])[2]; // Fallback
  const emailCol = detectEmailColumn(data[0]);

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

  const stats = calculateStats(data, phoneCol, emailCol);

  return { cleaned, stats };
};