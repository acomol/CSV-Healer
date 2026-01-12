import { CsvRow } from "../types";

// The specific pattern found in the user's error: ="...+972..."
// We want to extract just the number.
const EXCEL_FORMULA_REGEX = /^="?(\+?\d+)"?$/;

export const cleanCellData = (value: string): string => {
  if (!value) return "";
  
  // Check if it looks like the specific Excel formula artifact
  // Example: ="=+972587506545" or ="0501234567"
  const match = value.match(EXCEL_FORMULA_REGEX);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback: If it starts with = and contains quotes, naive strip
  if (value.startsWith('=') && value.includes('"')) {
     return value.replace(/[="]/g, '').trim();
  }

  return value.trim();
};

export const detectFormulaErrors = (data: CsvRow[]): number => {
  let errorCount = 0;
  data.forEach(row => {
    Object.values(row).forEach(val => {
      if (val && typeof val === 'string' && val.startsWith('=')) {
        errorCount++;
      }
    });
  });
  return errorCount;
};

export const processCsvData = (data: CsvRow[]): CsvRow[] => {
  return data.map(row => {
    const newRow: CsvRow = {};
    Object.keys(row).forEach(key => {
      newRow[key] = cleanCellData(row[key]);
    });
    return newRow;
  });
};
