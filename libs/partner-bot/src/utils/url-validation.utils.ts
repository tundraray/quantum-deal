/**
 * URL Validation Utilities
 *
 * Provides functions to validate URLs for security and format compliance.
 * Used for validating referral URLs and other external links.
 */

/**
 * Validates if a string is a valid HTTPS URL
 * Type guard that narrows url to string when returning true
 * @param url - String to validate (can be undefined)
 * @returns true if valid HTTPS URL, false otherwise
 */
export function isValidHttpsUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid HTTP or HTTPS URL
 * @param url - String to validate
 * @returns true if valid HTTP/HTTPS URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return false;
  }

  try {
    const urlObj = new URL(url.trim());
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
