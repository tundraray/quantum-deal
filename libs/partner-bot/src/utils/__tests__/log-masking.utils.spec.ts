import { maskUserId, maskChannelId, maskUrl } from '../log-masking.utils';

describe('maskUserId', () => {
  it('should mask to last 4 digits', () => {
    const result = maskUserId(123456789);
    expect(result).toBe('***6789');
  });

  it('should handle short IDs (less than 4 digits)', () => {
    const result = maskUserId(123);
    expect(result).toBe('***123');
  });
});

describe('maskChannelId', () => {
  it('should mask channel ID appropriately', () => {
    // For @username format, show @ and last 4 chars
    const result = maskChannelId('@mychannel');
    expect(result).toBe('@***nnel');
  });

  it('should handle edge cases (short channel names)', () => {
    // Short channel names should remain as-is (5 chars or less including @)
    const result = maskChannelId('@ab');
    expect(result).toBe('@ab');
  });

  it('should handle numeric channel IDs', () => {
    const result = maskChannelId('-1001234567890');
    expect(result).toBe('***7890');
  });
});

describe('maskUrl', () => {
  it('should hide query parameters', () => {
    const result = maskUrl('https://example.com/path?secret=123&token=abc');
    expect(result).toBe('https://example.com/path');
  });

  it('should handle URLs without query parameters', () => {
    const result = maskUrl('https://example.com/path');
    expect(result).toBe('https://example.com/path');
  });

  it('should return invalid-url for malformed URLs', () => {
    const result = maskUrl('not-a-valid-url');
    expect(result).toBe('invalid-url');
  });
});
