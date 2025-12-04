/**
 * Channel information utilities for partner bot flow.
 */

/**
 * Result of channel info resolution
 */
export interface ChannelInfo {
  /** Display name of the channel (without @) */
  name: string;
  /** Full URL to the channel */
  url: string;
}

/**
 * Resolves channel name and URL from channel ID.
 *
 * @param channelId - Channel identifier (e.g., '@channelname' or numeric ID)
 * @param customName - Optional custom channel name from settings
 * @returns Object with resolved channel name and URL
 *
 * @example
 * ```typescript
 * resolveChannelInfo('@mychannel')
 * // => { name: 'mychannel', url: 'https://t.me/mychannel' }
 *
 * resolveChannelInfo('@mychannel', 'My Channel')
 * // => { name: 'My Channel', url: 'https://t.me/mychannel' }
 *
 * resolveChannelInfo('123456789')
 * // => { name: '123456789', url: 'https://t.me/123456789' }
 * ```
 */
export function resolveChannelInfo(
  channelId: string,
  customName?: string,
): ChannelInfo {
  const isUsername = channelId.startsWith('@');
  const nameFromId = isUsername ? channelId.substring(1) : channelId;

  return {
    name: customName ?? nameFromId,
    url: `https://t.me/${nameFromId}`,
  };
}
