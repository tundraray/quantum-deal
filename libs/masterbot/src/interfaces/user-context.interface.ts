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
    flowState?:
      | 'awaiting_subscription_name'
      | 'awaiting_broadcast_message'
      | 'confirming_broadcast'
      | 'selecting_status_filter'
      | 'selecting_bot_filter'
      | 'selecting_subscriptions'
      | null;

    /**
     * Context for the current command being executed
     * Helps distinguish between different command flows
     */
    commandContext?: string | null;

    /**
     * IDs of subscriptions selected for broadcasting
     * Supports multiple subscription selection in the redesigned broadcast flow
     */
    broadcastSubscriptionIds?: number[] | null;

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

    /**
     * Filter for broadcast subscriber status
     * Used during filter selection flow to target:
     * - 'active': active subscribers
     * - 'expired': expired subscribers
     * - 'no_subscription': users who never activated any subscription
     * null = not selected yet (default behavior targets active)
     */
    broadcastFilterStatus?: 'active' | 'expired' | 'no_subscription' | null;

    /**
     * Filter for broadcast bot selection
     * Used during filter selection flow to target specific bot's subscribers
     * null = all bots (default behavior)
     */
    broadcastFilterBotId?: number | null;
  };
}
