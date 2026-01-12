/**
 * Platform Service Tests
 * Tests for Meta and Google Ads phone/email normalization
 */

import { CsvRow } from '../types';
import {
  normalizePhoneForPlatform,
  normalizeEmailForPlatform,
  validateForPlatform,
  transformDataForPlatform,
  PLATFORM_CONFIGS
} from '../services/platformService';

// Test helper
const runTest = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

// ==================== PHONE NORMALIZATION TESTS ====================

console.log('\n📱 PHONE NORMALIZATION TESTS');
console.log('─'.repeat(50));

// Meta format tests (no + prefix)
runTest('Meta: Israeli local format 0501234567 → 972501234567', () => {
  const result = normalizePhoneForPlatform('0501234567', 'meta');
  assert(result === '972501234567', `Expected 972501234567, got ${result}`);
});

runTest('Meta: Short format 501234567 → 972501234567', () => {
  const result = normalizePhoneForPlatform('501234567', 'meta');
  assert(result === '972501234567', `Expected 972501234567, got ${result}`);
});

runTest('Meta: Already international 972501234567 → 972501234567', () => {
  const result = normalizePhoneForPlatform('972501234567', 'meta');
  assert(result === '972501234567', `Expected 972501234567, got ${result}`);
});

runTest('Meta: With dashes 050-123-4567 → 972501234567', () => {
  const result = normalizePhoneForPlatform('050-123-4567', 'meta');
  assert(result === '972501234567', `Expected 972501234567, got ${result}`);
});

runTest('Meta: Excel formula ="0501234567" → 972501234567', () => {
  const result = normalizePhoneForPlatform('="0501234567"', 'meta');
  assert(result === '972501234567', `Expected 972501234567, got ${result}`);
});

runTest('Meta: No + prefix in output', () => {
  const result = normalizePhoneForPlatform('+972501234567', 'meta');
  assert(!result.includes('+'), `Meta format should not include +, got ${result}`);
});

// Google format tests (+ prefix - E.164)
runTest('Google: Israeli local 0501234567 → +972501234567', () => {
  const result = normalizePhoneForPlatform('0501234567', 'google');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

runTest('Google: Short format 501234567 → +972501234567', () => {
  const result = normalizePhoneForPlatform('501234567', 'google');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

runTest('Google: Already international 972501234567 → +972501234567', () => {
  const result = normalizePhoneForPlatform('972501234567', 'google');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

runTest('Google: With plus +972501234567 → +972501234567', () => {
  const result = normalizePhoneForPlatform('+972501234567', 'google');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

runTest('Google: Excel formula ="0521234567" → +972521234567', () => {
  const result = normalizePhoneForPlatform('="0521234567"', 'google');
  assert(result === '+972521234567', `Expected +972521234567, got ${result}`);
});

runTest('Google: Scientific notation 9.72501E+11 → +972501000000', () => {
  const result = normalizePhoneForPlatform('9.72501E+11', 'google');
  assert(result.startsWith('+972'), `Expected +972..., got ${result}`);
});

runTest('Google: International prefix 00972501234567 → +972501234567', () => {
  const result = normalizePhoneForPlatform('00972501234567', 'google');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

// ==================== EMAIL NORMALIZATION TESTS ====================

console.log('\n📧 EMAIL NORMALIZATION TESTS');
console.log('─'.repeat(50));

runTest('Meta: Lowercase email Test@Example.COM → test@example.com', () => {
  const result = normalizeEmailForPlatform('Test@Example.COM', 'meta');
  assert(result === 'test@example.com', `Expected test@example.com, got ${result}`);
});

runTest('Meta: Trim spaces " test@example.com " → test@example.com', () => {
  const result = normalizeEmailForPlatform('  test@example.com  ', 'meta');
  assert(result === 'test@example.com', `Expected test@example.com, got ${result}`);
});

runTest('Google: Lowercase email TEST@GMAIL.COM → test@gmail.com', () => {
  const result = normalizeEmailForPlatform('TEST@GMAIL.COM', 'google');
  assert(result === 'test@gmail.com', `Expected test@gmail.com, got ${result}`);
});

// ==================== VALIDATION TESTS ====================

console.log('\n🔍 VALIDATION TESTS');
console.log('─'.repeat(50));

runTest('Meta: Valid with 1 row', () => {
  const data: CsvRow[] = [{ phone: '0501234567', email: 'test@example.com' }];
  const result = validateForPlatform(data, 'meta', 'phone', 'email');
  assert(result.valid === true, `Expected valid, got ${JSON.stringify(result)}`);
});

runTest('Google: Invalid with < 100 rows', () => {
  const data: CsvRow[] = Array(50).fill({ phone: '0501234567', email: 'test@example.com' });
  const result = validateForPlatform(data, 'google', 'phone', 'email');
  assert(result.valid === false, `Expected invalid for Google with < 100 rows`);
  assert(result.errors.some(e => e.includes('100')), 'Error should mention 100 records');
});

runTest('Google: Valid with 100+ rows', () => {
  const data: CsvRow[] = Array(100).fill({ phone: '0501234567', email: 'test@example.com' });
  const result = validateForPlatform(data, 'google', 'phone', 'email');
  assert(result.valid === true, `Expected valid for Google with 100 rows`);
});

runTest('Both: Invalid without any identifier column', () => {
  const data: CsvRow[] = [{ name: 'John' }];
  const resultMeta = validateForPlatform(data, 'meta', null, null);
  const resultGoogle = validateForPlatform(data, 'google', null, null);
  assert(resultMeta.valid === false, 'Meta should be invalid without identifiers');
  assert(resultGoogle.valid === false, 'Google should be invalid without identifiers');
});

// ==================== TRANSFORM TESTS ====================

console.log('\n🔄 TRANSFORM TESTS');
console.log('─'.repeat(50));

runTest('Meta: Transform keeps original column names', () => {
  const data: CsvRow[] = [{ telefon: '0501234567', mail: 'test@example.com' }];
  const result = transformDataForPlatform(data, 'meta', 'telefon', 'mail');
  assert(result.length === 1, 'Should have 1 row');
  assert(result[0]['telefon'] === '972501234567', `Phone should be normalized, got ${result[0]['telefon']}`);
  assert(result[0]['mail'] === 'test@example.com', `Email should be normalized`);
});

runTest('Google: Transform uses English headers', () => {
  const data: CsvRow[] = [{ telefon: '0501234567', mail: 'test@example.com' }];
  const result = transformDataForPlatform(data, 'google', 'telefon', 'mail');
  assert(result.length === 1, 'Should have 1 row');
  assert('Phone' in result[0], 'Should have Phone header');
  assert('Email' in result[0], 'Should have Email header');
  assert(result[0]['Phone'] === '+972501234567', `Phone should be E.164, got ${result[0]['Phone']}`);
});

runTest('Transform filters empty rows', () => {
  const data: CsvRow[] = [
    { phone: '0501234567', email: 'test@example.com' },
    { phone: '', email: '' },
    { phone: '0521234567', email: '' }
  ];
  const result = transformDataForPlatform(data, 'meta', 'phone', 'email');
  assert(result.length === 2, `Should have 2 rows after filtering empty, got ${result.length}`);
});

// ==================== PLATFORM CONFIG TESTS ====================

console.log('\n⚙️ PLATFORM CONFIG TESTS');
console.log('─'.repeat(50));

runTest('Meta config: No + prefix', () => {
  assert(PLATFORM_CONFIGS.meta.phoneFormat.includePlus === false, 'Meta should not include +');
});

runTest('Google config: Has + prefix', () => {
  assert(PLATFORM_CONFIGS.google.phoneFormat.includePlus === true, 'Google should include +');
});

runTest('Google config: Min 100 rows', () => {
  assert(PLATFORM_CONFIGS.google.minRows === 100, 'Google should require 100 min rows');
});

runTest('Meta config: Min 1 row', () => {
  assert(PLATFORM_CONFIGS.meta.minRows === 1, 'Meta should require 1 min row');
});

// ==================== SUMMARY ====================

console.log('\n' + '═'.repeat(50));
console.log('PLATFORM SERVICE TESTS COMPLETED');
console.log('═'.repeat(50) + '\n');
