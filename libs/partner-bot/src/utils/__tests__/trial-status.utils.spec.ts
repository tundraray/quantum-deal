// Trial Status Utils Tests
// Tests for trial status calculation utility functions

import {
  calculateRemainingTimeDisplay,
  calculateDaysRemaining,
} from '../trial-status.utils';

describe('calculateRemainingTimeDisplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show days remaining when >= 1 day left', () => {
    const expiresAt = new Date('2025-01-18T12:00:00Z'); // 3 days from now
    const result = calculateRemainingTimeDisplay(expiresAt);
    expect(result).toContain('3');
    expect(result.toLowerCase()).toContain('day');
  });

  it('should show hours remaining when < 1 day left', () => {
    const expiresAt = new Date('2025-01-15T20:00:00Z'); // 8 hours from now
    const result = calculateRemainingTimeDisplay(expiresAt);
    expect(result).toContain('8');
    expect(result.toLowerCase()).toContain('hour');
  });

  it('should handle expired trials (negative time)', () => {
    const expiresAt = new Date('2025-01-14T12:00:00Z'); // 1 day ago
    const result = calculateRemainingTimeDisplay(expiresAt);
    expect(result.toLowerCase()).toMatch(/expired|0/);
  });

  it('should handle edge case of exactly 24 hours', () => {
    const expiresAt = new Date('2025-01-16T12:00:00Z'); // exactly 24 hours
    const result = calculateRemainingTimeDisplay(expiresAt);
    expect(result).toContain('1');
    expect(result.toLowerCase()).toContain('day');
  });
});

describe('calculateDaysRemaining', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return correct number of days', () => {
    const expiresAt = new Date('2025-01-18T12:00:00Z'); // 3 days from now
    expect(calculateDaysRemaining(expiresAt)).toBe(3);
  });
});
