/**
 * Simulation Test Suite for CSV Healer
 * Generates realistic test data and runs through the full pipeline
 *
 * Run with: npx ts-node tests/simulation.ts
 */

import {
  detectIfHeaderRow,
  detectPhoneColumn,
  detectEmailColumn,
  processCsvData,
  generateQualityReport,
  removeDuplicates
} from '../utils/csvHelper';
import { CsvRow } from '../types';

// ============================================
// DATA GENERATORS
// ============================================

function generateIsraeliPhone(corrupt: 'none' | 'formula' | 'scientific' | 'short' = 'none'): string {
  const base = `05${Math.floor(Math.random() * 10)}${Math.floor(1000000 + Math.random() * 9000000)}`;

  switch (corrupt) {
    case 'formula':
      return `="${base}"`;
    case 'scientific':
      return `${parseFloat(base).toExponential(2)}`;
    case 'short':
      return base.slice(0, 7);
    default:
      return base;
  }
}

function generateEmail(uppercase = false): string {
  const names = ['john', 'jane', 'alex', 'sarah', 'mike', 'emma', 'david', 'lisa'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.co.il', 'walla.co.il'];
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const num = Math.floor(Math.random() * 1000);
  const email = `${name}${num}@${domain}`;
  return uppercase ? email.toUpperCase() : email;
}

function generateHebrewName(): string {
  const firstNames = ['יוסי', 'דנה', 'אבי', 'מיכל', 'רון', 'שירה', 'גיא', 'נועה'];
  const lastNames = ['כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אברהם', 'דוד'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

// ============================================
// SIMULATION SCENARIOS
// ============================================

interface SimulationResult {
  scenario: string;
  rows: number;
  headerDetected: boolean;
  phoneColDetected: string | null;
  emailColDetected: string | null;
  qualityScore: number;
  duplicatesRemoved: number;
  processingTime: number;
}

function runSimulation(name: string, data: CsvRow[], hasHeader: boolean): SimulationResult {
  const start = Date.now();

  // Step 1: Header Detection
  const firstRow = data[0];
  const headerDetected = hasHeader ? detectIfHeaderRow(firstRow) : false;

  // Step 2: Column Detection
  const phoneCol = detectPhoneColumn(data);
  const emailCol = detectEmailColumn(data);

  // Step 3: Quality Report
  const report = generateQualityReport(data, phoneCol, emailCol);

  // Step 4: Process Data
  const { cleaned } = processCsvData(data);

  // Step 5: Remove Duplicates
  const deduplicated = removeDuplicates(cleaned, phoneCol, emailCol);

  const end = Date.now();

  return {
    scenario: name,
    rows: data.length,
    headerDetected,
    phoneColDetected: phoneCol,
    emailColDetected: emailCol,
    qualityScore: report.qualityScore,
    duplicatesRemoved: cleaned.length - deduplicated.length,
    processingTime: end - start
  };
}

// ============================================
// SCENARIO 1: Clean CRM Export
// ============================================
console.log('\n🧪 SIMULATION: Clean CRM Export (ideal data)\n');

const cleanData: CsvRow[] = [
  { phone: 'טלפון', email: 'אימייל', name: 'שם' } // Hebrew headers
];

for (let i = 0; i < 1000; i++) {
  cleanData.push({
    phone: generateIsraeliPhone('none'),
    email: generateEmail(false),
    name: generateHebrewName()
  });
}

const cleanResult = runSimulation('Clean CRM Export', cleanData.slice(1), true);
console.log(`📊 Results:`, cleanResult);

// ============================================
// SCENARIO 2: Excel Corrupted Export
// ============================================
console.log('\n🧪 SIMULATION: Excel Corrupted Export (formulas + scientific)\n');

const corruptedData: CsvRow[] = [];
for (let i = 0; i < 1000; i++) {
  const corruptType = Math.random();
  let phone: string;

  if (corruptType < 0.3) {
    phone = generateIsraeliPhone('formula'); // 30% formula
  } else if (corruptType < 0.4) {
    phone = generateIsraeliPhone('scientific'); // 10% scientific
  } else {
    phone = generateIsraeliPhone('none'); // 60% clean
  }

  corruptedData.push({
    'Column 1': generateHebrewName(),
    'Column 2': phone,
    'Column 3': generateEmail(Math.random() > 0.5) // 50% uppercase
  });
}

const corruptedResult = runSimulation('Excel Corrupted', corruptedData, false);
console.log(`📊 Results:`, corruptedResult);

// ============================================
// SCENARIO 3: Duplicate Heavy List
// ============================================
console.log('\n🧪 SIMULATION: Duplicate Heavy List (many repeats)\n');

const duplicateData: CsvRow[] = [];
const uniquePhones = Array.from({ length: 200 }, () => generateIsraeliPhone('none'));
const uniqueEmails = Array.from({ length: 200 }, () => generateEmail(false));

for (let i = 0; i < 1000; i++) {
  // Reuse phones and emails to create duplicates
  duplicateData.push({
    phone: uniquePhones[i % 200],
    email: uniqueEmails[i % 200],
    name: generateHebrewName()
  });
}

const duplicateResult = runSimulation('Duplicate Heavy', duplicateData, false);
console.log(`📊 Results:`, duplicateResult);

// ============================================
// SCENARIO 4: No Headers Export
// ============================================
console.log('\n🧪 SIMULATION: No Headers Export (data-only CSV)\n');

const noHeaderData: CsvRow[] = [];
for (let i = 0; i < 500; i++) {
  noHeaderData.push({
    'col_0': generateHebrewName(),
    'col_1': generateIsraeliPhone('none'),
    'col_2': generateEmail(false)
  });
}

// Simulate what happens when first row is data
const firstRowCheck = detectIfHeaderRow(noHeaderData[0]);
console.log(`First row detected as header: ${firstRowCheck}`);

const noHeaderResult = runSimulation('No Headers', noHeaderData, false);
console.log(`📊 Results:`, noHeaderResult);

// ============================================
// SCENARIO 5: Large File Performance
// ============================================
console.log('\n🧪 SIMULATION: Large File Performance (10K rows)\n');

const largeData: CsvRow[] = [];
for (let i = 0; i < 10000; i++) {
  const corruptType = Math.random();
  let phone: string;

  if (corruptType < 0.1) phone = generateIsraeliPhone('formula');
  else if (corruptType < 0.15) phone = generateIsraeliPhone('scientific');
  else if (corruptType < 0.2) phone = '';
  else phone = generateIsraeliPhone('none');

  largeData.push({
    phone: phone,
    email: Math.random() > 0.1 ? generateEmail(Math.random() > 0.7) : '',
    name: generateHebrewName()
  });
}

const largeResult = runSimulation('Large File (10K)', largeData, false);
console.log(`📊 Results:`, largeResult);
console.log(`⏱️  Processing time: ${largeResult.processingTime}ms`);

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📋 SIMULATION SUMMARY');
console.log('='.repeat(60));

const results = [cleanResult, corruptedResult, duplicateResult, noHeaderResult, largeResult];

console.log('\n| Scenario | Rows | Phone Col | Quality | Dups Removed | Time |');
console.log('|----------|------|-----------|---------|--------------|------|');

results.forEach(r => {
  console.log(`| ${r.scenario.padEnd(20)} | ${String(r.rows).padEnd(4)} | ${(r.phoneColDetected || 'N/A').padEnd(9)} | ${String(r.qualityScore).padEnd(7)} | ${String(r.duplicatesRemoved).padEnd(12)} | ${r.processingTime}ms |`);
});

console.log('\n✅ All simulations completed successfully!\n');
