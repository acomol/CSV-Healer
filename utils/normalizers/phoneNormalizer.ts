/**
 * Unified Phone Normalizer for CSV Healer
 *
 * Consolidates phone normalization logic from csvHelper.ts and platformService.ts
 * into a single source of truth. Supports multiple advertising platforms (Meta, Google)
 * with platform-specific formatting requirements.
 *
 * @module phoneNormalizer
 */

// ============================================
// Constants
// ============================================

/**
 * Israeli country code for phone number normalization
 */
export const ISRAELI_COUNTRY_CODE = '972';

/**
 * Israeli local phone prefix (leading zero)
 */
export const ISRAELI_LOCAL_PREFIX = '0';

/**
 * Minimum number of digits for a valid phone number
 */
export const MIN_PHONE_DIGITS = 9;

/**
 * Maximum number of digits for a valid phone number (E.164 standard)
 */
export const MAX_PHONE_DIGITS = 15;

/**
 * Israeli mobile prefix pattern (after removing leading zero)
 */
const ISRAELI_MOBILE_PREFIXES = ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59'];

/**
 * Regex to identify Excel formula artifacts (e.g., ="0501234567" or ="+972501234567")
 */
const EXCEL_FORMULA_REGEX = /^="?(\+?[\dE,\.]+)"?$/;

/**
 * Regex to identify scientific notation (e.g., 9.72E+11 or 4,47E+11)
 */
const SCIENTIFIC_NOTATION_REGEX = /^[\d,\.]+[Ee]\+\d+$/;

// ============================================
// Types and Interfaces
// ============================================

/**
 * Phone format types that can be detected
 */
export type PhoneFormat = 'local' | 'international' | 'short' | 'unknown';

/**
 * Options for phone normalization
 */
export interface NormalizeOptions {
  /**
   * Country code to use for normalization (default: '972' for Israel)
   */
  countryCode?: string;

  /**
   * Whether to include the '+' prefix in the output
   * - false for Meta Ads (972501234567)
   * - true for Google Ads (+972501234567, E.164 format)
   * @default false
   */
  includePlus?: boolean;

  /**
   * Only remove non-digit characters without any formatting or normalization
   * Useful for cleaning data before custom processing
   * @default false
   */
  cleanOnly?: boolean;
}

/**
 * Result of phone normalization with metadata
 */
export interface NormalizeResult {
  /**
   * The normalized phone number value
   */
  value: string;

  /**
   * Whether the phone number was modified during normalization
   */
  wasFixed: boolean;

  /**
   * Whether the resulting phone number is valid
   */
  isValid: boolean;

  /**
   * The detected format of the original phone number
   */
  originalFormat: PhoneFormat;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Removes all non-digit characters from a phone string.
 * Also handles Excel formula artifacts and extracts the numeric content.
 *
 * @param phone - The raw phone string to clean
 * @returns A string containing only digits
 *
 * @example
 * cleanPhoneDigits('050-123-4567')     // Returns '0501234567'
 * cleanPhoneDigits('="0501234567"')    // Returns '0501234567'
 * cleanPhoneDigits('+972-50-123-4567') // Returns '972501234567'
 */
export function cleanPhoneDigits(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  let cleaned = phone.trim();

  // Handle Excel formula artifacts (e.g., ="0501234567" or ="+972501234567")
  if (cleaned.startsWith('=') || cleaned.includes('"')) {
    // Try to match the Excel formula pattern
    const formulaMatch = cleaned.match(EXCEL_FORMULA_REGEX);
    if (formulaMatch) {
      cleaned = formulaMatch[1];
    } else {
      // Fallback: just remove = and " characters
      cleaned = cleaned.replace(/[="]/g, '');
    }
  }

  // Handle scientific notation (e.g., 9.72E+11, 4,47E+11)
  // Try to convert to actual number first
  if (SCIENTIFIC_NOTATION_REGEX.test(cleaned)) {
    try {
      // Replace comma with dot for European number format
      const normalized = cleaned.replace(',', '.');
      const numValue = parseFloat(normalized);
      if (!isNaN(numValue) && isFinite(numValue)) {
        cleaned = Math.round(numValue).toString();
      }
    } catch {
      // Keep original if conversion fails
    }
  }

  // Remove all non-digit characters
  return cleaned.replace(/\D/g, '');
}

/**
 * Validates whether a phone number is a valid Israeli phone number.
 * Checks for proper length and valid mobile prefixes.
 *
 * @param phone - The phone number to validate (can be raw or cleaned)
 * @returns True if the phone number is a valid Israeli phone
 *
 * @example
 * isValidIsraeliPhone('0501234567')     // Returns true
 * isValidIsraeliPhone('972501234567')   // Returns true
 * isValidIsraeliPhone('+972501234567')  // Returns true
 * isValidIsraeliPhone('123')            // Returns false
 */
export function isValidIsraeliPhone(phone: string): boolean {
  const digits = cleanPhoneDigits(phone);

  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return false;
  }

  // Check for valid Israeli format
  // Local format: 05XXXXXXXX (10 digits)
  if (digits.length === 10 && digits.startsWith('05')) {
    const prefix = digits.substring(1, 3);
    return ISRAELI_MOBILE_PREFIXES.includes(prefix);
  }

  // Short format without leading zero: 5XXXXXXXX (9 digits)
  if (digits.length === 9 && digits.startsWith('5')) {
    const prefix = digits.substring(0, 2);
    return ISRAELI_MOBILE_PREFIXES.includes(prefix);
  }

  // International format: 9725XXXXXXXX (12 digits)
  if (digits.length === 12 && digits.startsWith(ISRAELI_COUNTRY_CODE)) {
    const prefix = digits.substring(3, 5);
    return ISRAELI_MOBILE_PREFIXES.includes(prefix);
  }

  // International format with 00 prefix: 009725XXXXXXXX (14 digits)
  if (digits.length === 14 && digits.startsWith('00' + ISRAELI_COUNTRY_CODE)) {
    const prefix = digits.substring(5, 7);
    return ISRAELI_MOBILE_PREFIXES.includes(prefix);
  }

  // For other formats, just check reasonable length
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
}

/**
 * Detects the format of a phone number.
 *
 * @param phone - The phone number to analyze
 * @returns The detected format: 'local', 'international', 'short', or 'unknown'
 *
 * @example
 * detectPhoneFormat('0501234567')     // Returns 'local'
 * detectPhoneFormat('972501234567')   // Returns 'international'
 * detectPhoneFormat('+972501234567')  // Returns 'international'
 * detectPhoneFormat('501234567')      // Returns 'short'
 * detectPhoneFormat('123')            // Returns 'unknown'
 */
export function detectPhoneFormat(phone: string): PhoneFormat {
  const digits = cleanPhoneDigits(phone);

  if (digits.length < MIN_PHONE_DIGITS) {
    return 'unknown';
  }

  // Check for international format (starts with country code)
  if (digits.startsWith(ISRAELI_COUNTRY_CODE) && digits.length >= 11) {
    return 'international';
  }

  // Check for international format with 00 prefix
  if (digits.startsWith('00' + ISRAELI_COUNTRY_CODE)) {
    return 'international';
  }

  // Check for local format (starts with 0)
  if (digits.startsWith(ISRAELI_LOCAL_PREFIX) && digits.length === 10) {
    return 'local';
  }

  // Check for short format (missing leading zero)
  if (digits.startsWith('5') && digits.length === 9) {
    return 'short';
  }

  // Check for other international formats
  if (digits.length >= 11 && digits.length <= MAX_PHONE_DIGITS) {
    return 'international';
  }

  return 'unknown';
}

/**
 * Checks if the original phone string contains unrecoverable scientific notation.
 * Some scientific notation values cannot be accurately converted back to the original number.
 *
 * @param phone - The raw phone string to check
 * @returns True if the phone contains potentially unrecoverable scientific notation
 */
function hasUnrecoverableScientificNotation(phone: string): boolean {
  if (!phone.includes('E+') && !phone.includes('e+')) {
    return false;
  }

  // Try to convert and check if it results in a valid phone length
  try {
    const normalized = phone.replace(',', '.').replace(/[="]/g, '');
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || !isFinite(numValue)) {
      return true;
    }
    const converted = Math.round(numValue).toString();
    // If the converted number is too short or too long, it's likely corrupted
    return converted.length < MIN_PHONE_DIGITS || converted.length > MAX_PHONE_DIGITS;
  } catch {
    return true;
  }
}

// ============================================
// Main Normalization Function
// ============================================

/**
 * Normalizes a phone number according to the specified options.
 *
 * This is the main entry point for phone normalization. It handles:
 * - Excel formula artifacts (e.g., ="0501234567")
 * - Scientific notation (e.g., 9.72E+11)
 * - International prefix (00972...)
 * - Israeli local format (05X-XXX-XXXX)
 * - Short format (5XXXXXXXX)
 * - Dashes, spaces, and other formatting characters
 *
 * @param phone - The raw phone string to normalize
 * @param options - Normalization options
 * @returns The normalized phone string
 *
 * @example
 * // For Meta Ads (no + prefix)
 * normalizePhone('050-123-4567', { countryCode: '972', includePlus: false })
 * // Returns '972501234567'
 *
 * @example
 * // For Google Ads (E.164 format with + prefix)
 * normalizePhone('050-123-4567', { countryCode: '972', includePlus: true })
 * // Returns '+972501234567'
 *
 * @example
 * // Clean only mode
 * normalizePhone('050-123-4567', { cleanOnly: true })
 * // Returns '0501234567'
 */
export function normalizePhone(phone: string, options: NormalizeOptions = {}): string {
  const {
    countryCode = ISRAELI_COUNTRY_CODE,
    includePlus = false,
    cleanOnly = false,
  } = options;

  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Get cleaned digits
  let digits = cleanPhoneDigits(phone);

  if (!digits) {
    return '';
  }

  // If cleanOnly mode, return just the digits
  if (cleanOnly) {
    return digits;
  }

  // Normalize to international format
  digits = normalizeToInternational(digits, countryCode);

  // Add + prefix if required
  if (includePlus && digits.length > 0) {
    return '+' + digits;
  }

  return digits;
}

/**
 * Normalizes a phone number to international format.
 *
 * @param digits - The cleaned digit string
 * @param countryCode - The country code to use
 * @returns The normalized digits in international format
 */
function normalizeToInternational(digits: string, countryCode: string): string {
  // Case 1: Israeli local format with leading 0 (e.g., 0501234567)
  // Convert to international: 972501234567
  if (digits.startsWith('0') && digits.length === 10) {
    return countryCode + digits.substring(1);
  }

  // Case 2: Short format missing leading 0 (e.g., 501234567)
  // Add country code: 972501234567
  if (digits.startsWith('5') && digits.length === 9) {
    return countryCode + digits;
  }

  // Case 3: Already in international format with country code (e.g., 972501234567)
  // Keep as is
  if (digits.startsWith(countryCode) && digits.length === countryCode.length + 9) {
    return digits;
  }

  // Case 4: International format with 00 prefix (e.g., 00972501234567)
  // Remove 00 prefix: 972501234567
  if (digits.startsWith('00' + countryCode)) {
    return digits.substring(2);
  }

  // Case 5: Other local format with leading 0 (landlines, etc.)
  // Convert to international
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
    return countryCode + digits.substring(1);
  }

  // Default: return as is (might be international format from other country)
  return digits;
}

/**
 * Normalizes a phone number and returns detailed result with metadata.
 *
 * This function provides additional information about the normalization process,
 * including whether the phone was fixed, if it's valid, and the original format.
 *
 * @param phone - The raw phone string to normalize
 * @param options - Normalization options
 * @returns A NormalizeResult object with value, wasFixed, isValid, and originalFormat
 *
 * @example
 * normalizePhoneWithDetails('="050-123-4567"', { includePlus: false })
 * // Returns {
 * //   value: '972501234567',
 * //   wasFixed: true,
 * //   isValid: true,
 * //   originalFormat: 'local'
 * // }
 */
export function normalizePhoneWithDetails(
  phone: string,
  options: NormalizeOptions = {}
): NormalizeResult {
  if (!phone || typeof phone !== 'string') {
    return {
      value: '',
      wasFixed: false,
      isValid: false,
      originalFormat: 'unknown',
    };
  }

  const originalFormat = detectPhoneFormat(phone);
  const originalDigits = cleanPhoneDigits(phone);

  // Check for unrecoverable scientific notation
  if (hasUnrecoverableScientificNotation(phone)) {
    return {
      value: phone,
      wasFixed: false,
      isValid: false,
      originalFormat: 'unknown',
    };
  }

  const normalized = normalizePhone(phone, options);

  // Determine if the phone was fixed
  const wasFixed = phone.trim() !== normalized && normalized.length > 0;

  // Validate the result
  const cleanedNormalized = normalized.replace(/\D/g, '');
  const isValid = cleanedNormalized.length >= MIN_PHONE_DIGITS &&
                  cleanedNormalized.length <= MAX_PHONE_DIGITS;

  return {
    value: normalized,
    wasFixed,
    isValid,
    originalFormat,
  };
}

/**
 * Normalizes a phone number for Meta Ads (Facebook/Instagram).
 *
 * Meta requires:
 * - Country code included
 * - No + prefix
 * - No formatting characters
 *
 * @param phone - The raw phone string to normalize
 * @param countryCode - The country code to use (default: '972')
 * @returns A NormalizeResult object
 *
 * @example
 * normalizePhoneForMeta('050-123-4567')
 * // Returns { value: '972501234567', wasFixed: true, isValid: true, originalFormat: 'local' }
 */
export function normalizePhoneForMeta(
  phone: string,
  countryCode: string = ISRAELI_COUNTRY_CODE
): NormalizeResult {
  return normalizePhoneWithDetails(phone, {
    countryCode,
    includePlus: false,
  });
}

/**
 * Normalizes a phone number for Google Ads Customer Match.
 *
 * Google requires E.164 format:
 * - Country code included
 * - + prefix required
 * - No other formatting characters
 *
 * @param phone - The raw phone string to normalize
 * @param countryCode - The country code to use (default: '972')
 * @returns A NormalizeResult object
 *
 * @example
 * normalizePhoneForGoogle('050-123-4567')
 * // Returns { value: '+972501234567', wasFixed: true, isValid: true, originalFormat: 'local' }
 */
export function normalizePhoneForGoogle(
  phone: string,
  countryCode: string = ISRAELI_COUNTRY_CODE
): NormalizeResult {
  return normalizePhoneWithDetails(phone, {
    countryCode,
    includePlus: true,
  });
}

// ============================================
// Batch Processing Functions
// ============================================

/**
 * Normalizes an array of phone numbers.
 *
 * @param phones - Array of phone strings to normalize
 * @param options - Normalization options
 * @returns Array of normalized phone strings
 *
 * @example
 * normalizePhones(['050-123-4567', '0521234567'], { includePlus: false })
 * // Returns ['972501234567', '972521234567']
 */
export function normalizePhones(
  phones: string[],
  options: NormalizeOptions = {}
): string[] {
  return phones.map(phone => normalizePhone(phone, options));
}

/**
 * Normalizes an array of phone numbers with detailed results.
 *
 * @param phones - Array of phone strings to normalize
 * @param options - Normalization options
 * @returns Array of NormalizeResult objects
 */
export function normalizePhonesWithDetails(
  phones: string[],
  options: NormalizeOptions = {}
): NormalizeResult[] {
  return phones.map(phone => normalizePhoneWithDetails(phone, options));
}
