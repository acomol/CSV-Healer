/**
 * QA Test Suite for CSV Healer
 * Run with: npx ts-node tests/csvHelper.test.ts
 */

import {
  detectIfHeaderRow,
  generateAutoHeaders,
  detectPhoneColumn,
  detectEmailColumn,
  normalizePhoneForFb,
  normalizeEmailForFb,
  detectDuplicates,
  categorizeErrors,
  generateQualityReport,
  removeDuplicates
} from '../utils/csvHelper';
import { CsvRow } from '../types';

// Test utilities
let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} - Error: ${e}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

// ============================================
// TEST SUITE: Smart Header Detection
// ============================================
console.log('\n📋 TEST SUITE: Smart Header Detection\n');

test('Detects header row with keywords', () => {
  const row = { col_0: 'Phone', col_1: 'Email', col_2: 'Name' };
  return detectIfHeaderRow(row) === true;
});

test('Detects data row with email', () => {
  const row = { col_0: '0501234567', col_1: 'test@example.com', col_2: 'John' };
  return detectIfHeaderRow(row) === false;
});

test('Detects data row with phone pattern', () => {
  const row = { col_0: '="0501234567"', col_1: 'john@test.com' };
  return detectIfHeaderRow(row) === false;
});

test('Detects Hebrew headers', () => {
  const row = { col_0: 'טלפון', col_1: 'אימייל' };
  // Hebrew text is alphabetic but doesn't contain our keywords
  // This should be detected as header due to lack of data patterns
  return detectIfHeaderRow(row) === true;
});

// ============================================
// TEST SUITE: Auto Header Generation
// ============================================
console.log('\n📋 TEST SUITE: Auto Header Generation\n');

test('Generates correct number of headers', () => {
  const headers = generateAutoHeaders(5);
  return headers.length === 5;
});

test('Headers have correct naming', () => {
  const headers = generateAutoHeaders(3);
  return assertEqual(headers, ['Column 1', 'Column 2', 'Column 3']);
});

// ============================================
// TEST SUITE: Phone Normalization (Israel +972)
// ============================================
console.log('\n📋 TEST SUITE: Phone Normalization (Israel +972)\n');

test('Normalizes 050 format to 972', () => {
  const result = normalizePhoneForFb('0501234567');
  return result.value === '972501234567' && result.wasFixed && result.isValid;
});

test('Normalizes 50 format to 972', () => {
  const result = normalizePhoneForFb('501234567');
  return result.value === '972501234567' && result.wasFixed && result.isValid;
});

test('Keeps 972 format unchanged', () => {
  const result = normalizePhoneForFb('972501234567');
  return result.value === '972501234567' && result.isValid;
});

test('Strips Excel formula', () => {
  const result = normalizePhoneForFb('="0501234567"');
  return result.value === '972501234567' && result.wasFixed && result.isValid;
});

test('Handles phone with dashes', () => {
  const result = normalizePhoneForFb('050-123-4567');
  return result.value === '972501234567' && result.wasFixed && result.isValid;
});

test('Rejects scientific notation', () => {
  const result = normalizePhoneForFb('5.01234567E+9');
  return result.isValid === false;
});

test('Handles international format with +', () => {
  const result = normalizePhoneForFb('+972501234567');
  return result.value === '972501234567' && result.isValid;
});

// ============================================
// TEST SUITE: Email Normalization
// ============================================
console.log('\n📋 TEST SUITE: Email Normalization\n');

test('Converts email to lowercase', () => {
  const result = normalizeEmailForFb('John.Doe@Gmail.COM');
  return result.value === 'john.doe@gmail.com' && result.wasFixed && result.isValid;
});

test('Trims whitespace', () => {
  const result = normalizeEmailForFb('  test@example.com  ');
  return result.value === 'test@example.com' && result.wasFixed && result.isValid;
});

test('Validates correct email format', () => {
  const result = normalizeEmailForFb('valid@email.com');
  return result.isValid === true;
});

test('Rejects invalid email format', () => {
  const result = normalizeEmailForFb('invalid-email');
  return result.isValid === false;
});

// ============================================
// TEST SUITE: Column Detection (50-row scan)
// ============================================
console.log('\n📋 TEST SUITE: Column Detection\n');

test('Detects phone column by header keyword', () => {
  const data: CsvRow[] = [
    { name: 'John', phone: '0501234567', email: 'john@test.com' },
    { name: 'Jane', phone: '0502345678', email: 'jane@test.com' }
  ];
  return detectPhoneColumn(data) === 'phone';
});

test('Detects email column by header keyword', () => {
  const data: CsvRow[] = [
    { name: 'John', tel: '0501234567', email: 'john@test.com' },
    { name: 'Jane', tel: '0502345678', email: 'jane@test.com' }
  ];
  return detectEmailColumn(data) === 'email';
});

test('Detects phone column by content when header is ambiguous', () => {
  const data: CsvRow[] = [];
  for (let i = 0; i < 20; i++) {
    data.push({
      'Column 1': `Name${i}`,
      'Column 2': `050${1000000 + i}`,
      'Column 3': `user${i}@test.com`
    });
  }
  return detectPhoneColumn(data) === 'Column 2';
});

test('Detects email column by content', () => {
  const data: CsvRow[] = [];
  for (let i = 0; i < 20; i++) {
    data.push({
      'A': `Name${i}`,
      'B': `050${1000000 + i}`,
      'C': `user${i}@example.com`
    });
  }
  return detectEmailColumn(data) === 'C';
});

test('Returns null when no phone column found', () => {
  const data: CsvRow[] = [
    { name: 'John', city: 'Tel Aviv' },
    { name: 'Jane', city: 'Jerusalem' }
  ];
  return detectPhoneColumn(data) === null;
});

// ============================================
// TEST SUITE: Duplicate Detection
// ============================================
console.log('\n📋 TEST SUITE: Duplicate Detection\n');

test('Detects phone duplicates', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'a@test.com' },
    { phone: '0501234567', email: 'b@test.com' },
    { phone: '0502345678', email: 'c@test.com' }
  ];
  const result = detectDuplicates(data, 'phone', 'email');
  return result.phones.length === 1 && result.phones[0].count === 2;
});

test('Detects email duplicates', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'same@test.com' },
    { phone: '0502345678', email: 'same@test.com' },
    { phone: '0503456789', email: 'different@test.com' }
  ];
  const result = detectDuplicates(data, 'phone', 'email');
  return result.emails.length === 1 && result.emails[0].count === 2;
});

test('Counts total duplicate rows correctly', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'a@test.com' },
    { phone: '0501234567', email: 'b@test.com' },
    { phone: '0501234567', email: 'c@test.com' }
  ];
  const result = detectDuplicates(data, 'phone', 'email');
  return result.totalDuplicateRows === 2; // 3 occurrences = 2 duplicates
});

// ============================================
// TEST SUITE: Error Categorization
// ============================================
console.log('\n📋 TEST SUITE: Error Categorization\n');

test('Categorizes Excel formula errors', () => {
  const data: CsvRow[] = [
    { phone: '="0501234567"', email: 'test@test.com' }
  ];
  const result = categorizeErrors(data, 'phone', 'email');
  const formulaError = result.phone.find(e => e.type === 'excel_formula');
  return formulaError !== undefined && formulaError.count === 1;
});

test('Categorizes scientific notation errors', () => {
  const data: CsvRow[] = [
    { phone: '5.01E+9', email: 'test@test.com' }
  ];
  const result = categorizeErrors(data, 'phone', 'email');
  const sciError = result.phone.find(e => e.type === 'scientific_notation');
  return sciError !== undefined && sciError.count === 1;
});

test('Categorizes empty values', () => {
  const data: CsvRow[] = [
    { phone: '', email: 'test@test.com' },
    { phone: '  ', email: 'test2@test.com' }
  ];
  const result = categorizeErrors(data, 'phone', 'email');
  const emptyError = result.phone.find(e => e.type === 'empty');
  return emptyError !== undefined && emptyError.count === 2;
});

test('Categorizes invalid email format', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'not-an-email' }
  ];
  const result = categorizeErrors(data, 'phone', 'email');
  const invalidError = result.email.find(e => e.type === 'invalid_format');
  return invalidError !== undefined && invalidError.count === 1;
});

// ============================================
// TEST SUITE: Quality Report
// ============================================
console.log('\n📋 TEST SUITE: Quality Report\n');

test('Generates high score for clean data', () => {
  const data: CsvRow[] = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      phone: `050${1000000 + i}`,
      email: `user${i}@example.com`
    });
  }
  const report = generateQualityReport(data, 'phone', 'email');
  return report.qualityScore >= 80;
});

test('Generates low score for problematic data', () => {
  const data: CsvRow[] = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      phone: i < 50 ? `5.0${i}E+9` : '', // 50 scientific, 50 empty
      email: `user${i}@example.com`
    });
  }
  const report = generateQualityReport(data, 'phone', 'email');
  return report.qualityScore < 50;
});

test('Includes recommendations', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'a@test.com' },
    { phone: '0501234567', email: 'b@test.com' }
  ];
  const report = generateQualityReport(data, 'phone', 'email');
  return report.recommendations.length > 0;
});

// ============================================
// TEST SUITE: Duplicate Removal
// ============================================
console.log('\n📋 TEST SUITE: Duplicate Removal\n');

test('Removes duplicate rows keeping first', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'first@test.com' },
    { phone: '0501234567', email: 'second@test.com' },
    { phone: '0502345678', email: 'unique@test.com' }
  ];
  const result = removeDuplicates(data, 'phone', 'email', true);
  return result.length === 2 && result[0].email === 'first@test.com';
});

test('Removes duplicate rows keeping last', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'first@test.com' },
    { phone: '0501234567', email: 'second@test.com' },
    { phone: '0502345678', email: 'unique@test.com' }
  ];
  const result = removeDuplicates(data, 'phone', 'email', false);
  return result.length === 2 && result[0].email === 'second@test.com';
});

test('Keeps rows without identifiers', () => {
  const data: CsvRow[] = [
    { phone: '', email: '' },
    { phone: '0501234567', email: 'test@test.com' }
  ];
  const result = removeDuplicates(data, 'phone', 'email');
  return result.length === 2;
});

// ============================================
// RESULTS
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  process.exit(1);
}
