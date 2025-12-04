// Using Jest (project's test framework)
import { isValidHttpsUrl, isValidUrl } from '../url-validation.utils';

describe('isValidHttpsUrl', () => {
  it('should return true for valid HTTPS URLs', () => {
    expect(isValidHttpsUrl('https://example.com')).toBe(true);
    expect(isValidHttpsUrl('https://example.com/path')).toBe(true);
    expect(isValidHttpsUrl('https://sub.example.com:8080/path?query=1')).toBe(
      true,
    );
  });

  it('should return false for HTTP URLs', () => {
    expect(isValidHttpsUrl('http://example.com')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidHttpsUrl('not-a-url')).toBe(false);
    expect(isValidHttpsUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpsUrl('')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('should return true for HTTP and HTTPS URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should return false for non-URL strings', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('mailto:test@example.com')).toBe(false);
  });

  it('should handle edge cases (empty string, special chars)', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('   ')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});
