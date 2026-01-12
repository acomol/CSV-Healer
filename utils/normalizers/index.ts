/**
 * Normalizers index
 *
 * Re-exports all normalizer modules for convenient importing.
 *
 * @module normalizers
 */

export {
  // Main function
  normalizePhone,

  // Detailed normalization functions
  normalizePhoneWithDetails,
  normalizePhoneForMeta,
  normalizePhoneForGoogle,

  // Batch processing
  normalizePhones,
  normalizePhonesWithDetails,

  // Helper functions
  cleanPhoneDigits,
  isValidIsraeliPhone,
  detectPhoneFormat,

  // Constants
  ISRAELI_COUNTRY_CODE,
  ISRAELI_LOCAL_PREFIX,
  MIN_PHONE_DIGITS,
  MAX_PHONE_DIGITS,

  // Types
  type NormalizeOptions,
  type NormalizeResult,
  type PhoneFormat,
} from './phoneNormalizer';
