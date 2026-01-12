/**
 * Platform Service for CSV Healer
 * Supports multiple advertising platforms: Meta Ads, Google Ads
 * Each platform has specific formatting requirements
 */

import { CsvRow } from "../types";
import { logProcessing } from "../utils/logger";

export type Platform = 'meta' | 'google';

export interface PlatformConfig {
  name: string;
  displayName: string;
  phoneFormat: {
    includeCountryCode: boolean;
    includePlus: boolean;
    minDigits: number;
    maxDigits: number;
    defaultCountryCode: string;
  };
  emailFormat: {
    lowercase: boolean;
    trim: boolean;
  };
  requiredHeaders: string[];
  optionalHeaders: string[];
  supportedFormats: ('csv' | 'xlsx')[];
  minRows: number;
  hashingSupported: boolean;
}

/**
 * Platform configurations based on 2025-2026 documentation
 */
export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  meta: {
    name: 'meta',
    displayName: 'Meta Ads (Facebook/Instagram)',
    phoneFormat: {
      includeCountryCode: true,
      includePlus: false,      // Meta: 972501234567 (no +)
      minDigits: 10,
      maxDigits: 15,
      defaultCountryCode: '972'
    },
    emailFormat: {
      lowercase: true,
      trim: true
    },
    requiredHeaders: ['email', 'phone'],
    optionalHeaders: ['fn', 'ln', 'country', 'zip', 'ct', 'st', 'dob', 'gen'],
    supportedFormats: ['csv'],
    minRows: 1,
    hashingSupported: true
  },
  google: {
    name: 'google',
    displayName: 'Google Ads Customer Match',
    phoneFormat: {
      includeCountryCode: true,
      includePlus: true,       // Google: +972501234567 (E.164)
      minDigits: 10,
      maxDigits: 15,
      defaultCountryCode: '972'
    },
    emailFormat: {
      lowercase: true,
      trim: true
    },
    requiredHeaders: ['Email', 'Phone'],  // Google requires English headers
    optionalHeaders: ['First Name', 'Last Name', 'Country', 'Zip'],
    supportedFormats: ['csv'],
    minRows: 100,  // Google requires minimum 100 records
    hashingSupported: true
  }
};

/**
 * Normalize phone number for specific platform
 */
export const normalizePhoneForPlatform = (
  phone: string,
  platform: Platform,
  countryCode: string = '972'
): string => {
  const config = PLATFORM_CONFIGS[platform];

  // Remove all non-digit characters first
  let cleaned = phone.replace(/\D/g, '');

  // Handle Excel formula artifacts like ="0501234567"
  if (phone.includes('="')) {
    const match = phone.match(/="?([^"]+)"?/);
    if (match) {
      cleaned = match[1].replace(/\D/g, '');
    }
  }

  // Handle scientific notation (e.g., 9.73E+11)
  if (phone.includes('E+') || phone.includes('e+')) {
    try {
      cleaned = Math.round(parseFloat(phone)).toString();
    } catch {
      // Keep original cleaned value
    }
  }

  if (!cleaned) return '';

  // Israeli phone normalization
  // Local format: 05X-XXX-XXXX (10 digits starting with 05)
  // International: 9725XXXXXXXX (12 digits)

  // Remove leading zeros for Israeli numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Israeli local format: 0501234567 -> 972501234567
    cleaned = countryCode + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    // Missing leading 0: 501234567 -> 972501234567
    cleaned = countryCode + cleaned;
  } else if (cleaned.startsWith('972') && cleaned.length === 12) {
    // Already in international format
    // Keep as is
  } else if (cleaned.startsWith('00972')) {
    // International with 00 prefix
    cleaned = cleaned.substring(2);
  }

  // Validate length
  if (cleaned.length < config.phoneFormat.minDigits ||
      cleaned.length > config.phoneFormat.maxDigits) {
    logProcessing.warn('Phone length validation failed', {
      original: phone,
      cleaned,
      platform,
      length: cleaned.length
    });
    // Return cleaned anyway, let validation handle it
  }

  // Add + prefix for Google Ads (E.164 format)
  if (config.phoneFormat.includePlus) {
    return '+' + cleaned;
  }

  return cleaned;
};

/**
 * Normalize email for specific platform
 */
export const normalizeEmailForPlatform = (
  email: string,
  platform: Platform
): string => {
  const config = PLATFORM_CONFIGS[platform];
  let normalized = email;

  if (config.emailFormat.trim) {
    normalized = normalized.trim();
  }

  if (config.emailFormat.lowercase) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
};

/**
 * Get platform-specific header mapping
 */
export const getPlatformHeaders = (
  platform: Platform,
  detectedPhoneCol: string | null,
  detectedEmailCol: string | null
): { phone: string; email: string } => {
  const config = PLATFORM_CONFIGS[platform];

  // Google Ads requires specific English headers
  if (platform === 'google') {
    return {
      phone: 'Phone',
      email: 'Email'
    };
  }

  // Meta is more flexible, can use detected headers
  return {
    phone: detectedPhoneCol || 'phone',
    email: detectedEmailCol || 'email'
  };
};

/**
 * Validate data meets platform requirements
 */
export interface PlatformValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateForPlatform = (
  data: CsvRow[],
  platform: Platform,
  phoneCol: string | null,
  emailCol: string | null
): PlatformValidationResult => {
  const config = PLATFORM_CONFIGS[platform];
  const errors: string[] = [];
  const warnings: string[] = [];

  logProcessing.info('Validating data for platform', {
    platform,
    rowCount: data.length,
    phoneCol,
    emailCol
  });

  // Check minimum rows
  if (data.length < config.minRows) {
    if (platform === 'google') {
      errors.push(`Google Ads requires minimum ${config.minRows} records. Found: ${data.length}`);
    }
  }

  // Check for required columns
  if (!phoneCol && !emailCol) {
    errors.push('At least one identifier column (phone or email) is required');
  }

  // Validate phone formats
  if (phoneCol) {
    let invalidPhones = 0;
    data.forEach((row, idx) => {
      const phone = row[phoneCol];
      if (phone) {
        const normalized = normalizePhoneForPlatform(phone, platform);
        const digits = normalized.replace(/\D/g, '');
        if (digits.length < config.phoneFormat.minDigits) {
          invalidPhones++;
        }
      }
    });

    if (invalidPhones > 0) {
      warnings.push(`${invalidPhones} phone numbers may be invalid (too short)`);
    }
  }

  // Validate email formats
  if (emailCol) {
    let invalidEmails = 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    data.forEach((row) => {
      const email = row[emailCol];
      if (email && !emailRegex.test(email.trim())) {
        invalidEmails++;
      }
    });

    if (invalidEmails > 0) {
      warnings.push(`${invalidEmails} email addresses may be invalid`);
    }
  }

  // Platform-specific warnings
  if (platform === 'google' && data.length < 1000) {
    warnings.push('Google Ads works best with 1,000+ records for optimal matching');
  }

  logProcessing.info('Platform validation completed', {
    platform,
    valid: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Transform data for specific platform export
 */
export const transformDataForPlatform = (
  data: CsvRow[],
  platform: Platform,
  phoneCol: string | null,
  emailCol: string | null
): CsvRow[] => {
  const headers = getPlatformHeaders(platform, phoneCol, emailCol);

  logProcessing.info('Transforming data for platform', {
    platform,
    rowCount: data.length,
    sourcePhoneCol: phoneCol,
    sourceEmailCol: emailCol,
    targetHeaders: headers
  });

  return data.map(row => {
    const newRow: CsvRow = {};

    // Add phone with platform-specific normalization
    if (phoneCol && row[phoneCol]) {
      const normalizedPhone = normalizePhoneForPlatform(row[phoneCol], platform);
      newRow[headers.phone] = normalizedPhone;
    }

    // Add email with platform-specific normalization
    if (emailCol && row[emailCol]) {
      const normalizedEmail = normalizeEmailForPlatform(row[emailCol], platform);
      newRow[headers.email] = normalizedEmail;
    }

    return newRow;
  }).filter(row => {
    // Filter out rows with no valid identifiers
    return Object.values(row).some(v => v && v.trim());
  });
};

/**
 * Get platform display info for UI
 */
export const getPlatformInfo = (platform: Platform): {
  name: string;
  description: string;
  phoneExample: string;
  requirements: string[];
} => {
  switch (platform) {
    case 'meta':
      return {
        name: 'Meta Ads',
        description: 'Facebook & Instagram Custom Audiences',
        phoneExample: '972501234567',
        requirements: [
          'Phone: Country code + number (no +)',
          'Email: Lowercase, trimmed',
          'Flexible headers accepted'
        ]
      };
    case 'google':
      return {
        name: 'Google Ads',
        description: 'Customer Match audiences',
        phoneExample: '+972501234567',
        requirements: [
          'Phone: E.164 format with + prefix',
          'Email: Lowercase, trimmed',
          'English headers required (Email, Phone)',
          'Minimum 100 records'
        ]
      };
    default:
      return {
        name: 'Unknown',
        description: '',
        phoneExample: '',
        requirements: []
      };
  }
};
