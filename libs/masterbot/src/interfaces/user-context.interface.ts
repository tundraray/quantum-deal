import { Context } from '@quantumdeal/framework';
import { Manager } from '@quantumdeal/db';
import type { Message } from 'telegraf/types';

/**
 * MessageEntity type from Telegram Bot API
 * Represents special entities like bold text, links, mentions, etc.
 */
export type MessageEntity = NonNullable<
  Message.TextMessage['entities']
>[number];

/**
 * Extended Telegraf context interface for master bot that includes the authenticated user and manager
 */
export interface UserContext extends Context {
  /**
   * The manager object attached to the context after ManagersMiddleware authentication
   * This replaces the user field for master bot operations
   */
  manager?: Manager;

  /**
   * Session data for multi-step flows
   * Extended to include subscription broadcast specific fields
   */
  session: Context['session'] & {
    /**
     * Current state of the multi-step flow
     * Used to track which step of the conversation the user is in
     */
    flowState?: string | null;

    /**
     * Context for the current command being executed
     * Helps distinguish between different command flows
     */
    commandContext?: string | null;

    /**
     * ID of the subscription selected for broadcasting
     * Stored during the broadcast flow
     */
    broadcastSubscriptionId?: number | null;

    /**
     * Message content to be broadcast
     * Stored temporarily before confirmation
     */
    broadcastMessage?: string | null;

    /**
     * Message entities for preserving formatting
     * Stored along with the broadcast message to maintain text formatting
     * (bold, italic, links, code blocks, etc.)
     */
    broadcastMessageEntities?: MessageEntity[] | null;
  };
}
