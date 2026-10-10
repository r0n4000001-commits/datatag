/**
 * Utility functions for 5-digit product codes (12-345) and daily lots (DDMMYY)
 */

/**
 * Returns the lot code for a given date in DDMMYY format (e.g., 040926 for 4 de septiembre de 2026).
 * Cada día el lote corresponde a la fecha del día.
 */
export function getDailyLotCode(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

/**
 * Validates whether a lot matches the daily DDMMYY format (optionally with sub-batch suffix like -A, -01, etc.)
 */
export function isDailyLotCode(lot: string): boolean {
  if (!lot) return false;
  return /^\d{6}([-_][A-Za-z0-9]+)?$/.test(lot.trim());
}

/**
 * Formats a raw product code string into a 5-digit code with the pattern 12-345 (XX-XXX).
 * Examples:
 *  "12345" -> "12-345"
 *  "12-345" -> "12-345"
 *  "PRD-1001" -> "01-001"
 *  "06106" -> "06-106"
 *  "1" -> "00-001"
 */
export function formatProductCode(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // If already exactly 2 digits, hyphen, 3 digits
  if (/^\d{2}-\d{3}$/.test(trimmed)) {
    return trimmed;
  }

  // Extract all digits
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 5) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  if (digits.length > 5) {
    // If more than 5 digits, take first 5 digits
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
  }

  if (digits.length > 0 && digits.length < 5) {
    // Pad to 5 digits with leading zeros
    const padded = digits.padStart(5, '0');
    return `${padded.slice(0, 2)}-${padded.slice(2)}`;
  }

  return trimmed;
}

/**
 * Formats user input as they type numbers into a 5-digit product code with hyphen (12-345).
 */
export function handleProductCodeInputMask(inputValue: string): string {
  // Only keep digits and hyphen
  const clean = inputValue.replace(/[^\d-]/g, '');
  const digits = clean.replace(/\D/g, '').slice(0, 5);

  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Helper to check if a product code conforms to the required 5 digits (12-345)
 */
export function isValidProductCode(code: string): boolean {
  return /^\d{2}-\d{3}$/.test((code || '').trim());
}

/**
 * Generates a new 5-digit product code in format 12-345, ensuring no collision with existing codes.
 */
export function generateNextProductCode(existingCodes: string[] = []): string {
  const existingSet = new Set(existingCodes.map((c) => c.trim()));

  // Try sequential search starting from 01-001
  for (let prefix = 1; prefix <= 99; prefix++) {
    for (let suffix = 1; suffix <= 999; suffix++) {
      const candidate = `${String(prefix).padStart(2, '0')}-${String(suffix).padStart(3, '0')}`;
      if (!existingSet.has(candidate)) {
        return candidate;
      }
    }
  }

  return '12-345';
}
