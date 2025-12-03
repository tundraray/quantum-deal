// Partner Bot Interfaces
// Re-exports common interfaces from libs/bot with extensions

import type { UserContext as BaseUserContext } from '@quantumdeal/bot/interfaces';
import type { BotUser } from '@quantumdeal/db';

export type { BaseUserContext as UserContext };
export type {
  UserWithSubscriptions,
  ActiveSubscriptionDto,
} from '@quantumdeal/bot/interfaces';
export {
  hasActiveSubscriptions,
  hasSubscriptionType,
  getActiveSubscriptionByType,
  hasSignalsSubscription,
  hasBroadcastSubscription,
  hasFeature,
  getFeatureConfig,
  hasAllFeatures,
  hasAnyFeature,
} from '@quantumdeal/bot/interfaces';

/**
 * Extended context interface for partner bot handlers with botId and botUser.
 *
 * In dynamic bot architecture, the botId is injected by the middlewareFactory
 * configured in TelegrafModule.forRootDynamic(). This enables handlers to
 * work with any bot that has partnerFlowEnabled, not just a hardcoded bot.
 *
 * The botUser is resolved by UserManagementMiddleware and represents the
 * user+bot combination from the bot_users table. Use botUser.id for
 * subscription operations.
 *
 * @example
 * ```typescript
 * @Action('partner_verify_subscription')
 * async handleVerify(@Ctx() ctx: PartnerBotContext): Promise<void> {
 *   const botId = ctx.botId;
 *   if (!botId) {
 *     throw new Error('botId not available in context');
 *   }
 *   // Use botUser.id for subscription operations
 *   const botUserId = ctx.botUser?.id;
 *   if (botUserId) {
 *     // Query subscriptions using botUserId
 *   }
 * }
 * ```
 */
export interface PartnerBotContext extends BaseUserContext {
  /**
   * Database ID of the current bot (from bots table).
   * Injected by middleware for dynamic bots.
   * Will be undefined for static bots that don't use the dynamic loading system.
   */
  botId?: number;

  /**
   * Bot-user relationship record from bot_users table.
   * Attached by UserManagementMiddleware after resolving/creating the botUser.
   * Use botUser.id for subscription queries (references bot_users.id, not telegramId).
   */
  botUser?: BotUser;
}
