/**
 * Trial Status Utility Functions
 *
 * Provides reusable functions for calculating and displaying trial status information.
 * Extracted from start.update.ts for better reusability and testability.
 */

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

/**
 * Calculates the number of days remaining until expiration
 * @param expiresAt - Expiration date
 * @returns Number of days remaining (0 if expired)
 */
export function calculateDaysRemaining(expiresAt: Date): number {
  const now = new Date();
  const remaining = expiresAt.getTime() - now.getTime();

  if (remaining <= 0) {
    return 0;
  }

  return Math.floor(remaining / MS_PER_DAY);
}

/**
 * Calculates and formats remaining time for display
 * Shows days if >= 1 day remaining, otherwise shows hours
 * @param expiresAt - Expiration date
 * @returns Formatted string for display (e.g., "3 days", "8 hours", "Expired")
 */
export function calculateRemainingTimeDisplay(expiresAt: Date): string {
  const now = new Date();
  const remaining = expiresAt.getTime() - now.getTime();

  if (remaining <= 0) {
    return 'Expired';
  }

  const days = Math.floor(remaining / MS_PER_DAY);

  if (days >= 1) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(remaining / MS_PER_HOUR);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
