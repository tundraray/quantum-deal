/**
 * Log Masking Utilities
 *
 * Functions for masking sensitive data in log output.
 * Used to protect user privacy while maintaining useful debugging information.
 */

/**
 * Masks a user ID, showing only the last 4 digits
 *
 * @param userId - Telegram user ID
 * @returns Masked user ID string (e.g., "***6789")
 * @example
 * maskUserId(123456789) // "***6789"
 * maskUserId(123) // "***123"
 */
export function maskUserId(userId: number): string {
  const userIdStr = userId.toString();
  if (userIdStr.length <= 4) {
    return `***${userIdStr}`;
  }
  return `***${userIdStr.slice(-4)}`;
}

/**
 * Masks a channel ID for logging (show only prefix and last 4 characters)
 *
 * @param channelId - Channel identifier (e.g., "@channelname" or "-1001234567890")
 * @returns Masked channel ID string
 * @example
 * maskChannelId('@mychannel') // "@***nnel"
 * maskChannelId('@ab') // "@ab" (short names kept as-is)
 * maskChannelId('-1001234567890') // "***7890"
 */
export function maskChannelId(channelId: string): string {
  if (channelId.startsWith('@')) {
    // For @username format, show @ and last 4 chars
    if (channelId.length <= 5) {
      return channelId;
    }
    return `@***${channelId.slice(-4)}`;
  }
  // For numeric IDs, show last 4 digits
  if (channelId.length <= 4) {
    return `***${channelId}`;
  }
  return `***${channelId.slice(-4)}`;
}

/**
 * Masks a URL for logging (hides query parameters)
 *
 * @param url - URL that may contain sensitive query parameters
 * @returns URL with only protocol, hostname, and pathname (no query params)
 * @example
 * maskUrl('https://example.com/path?secret=123') // "https://example.com/path"
 * maskUrl('https://example.com/path') // "https://example.com/path"
 * maskUrl('invalid') // "invalid-url"
 */
export function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return 'invalid-url';
  }
}
