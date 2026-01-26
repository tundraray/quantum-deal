import { SetMetadata } from '@nestjs/common';
import { FEATURE_FLAG_METADATA } from '../../telegraf.constants';

/**
 * Decorator to conditionally register handler based on bot feature flag
 *
 * When applied to an @Update class, the handler will only be registered
 * on bots where the specified feature is enabled in BotSettings.features.
 *
 * @param featureKey - Key from BotSettings.features (e.g., 'paymentsEnabled')
 *
 * @example
 * ```typescript
 * @Update()
 * @RequiresFeature('paymentsEnabled')
 * export class PaymentUpdate {
 *   @Command('pay')
 *   async onPay(@Ctx() ctx) {
 *     // Only executes on bots with paymentsEnabled: true
 *     await ctx.reply('Payment menu...')
 *   }
 * }
 * ```
 *
 * @example Multiple features (use both decorators)
 * ```typescript
 * @Update()
 * @RequiresFeature('paymentsEnabled')
 * @RequiresFeature('trialEnabled') // Both must be true
 * export class TrialPaymentUpdate { ... }
 * ```
 */
export const RequiresFeature = (featureKey: string) =>
  SetMetadata(FEATURE_FLAG_METADATA, featureKey);
