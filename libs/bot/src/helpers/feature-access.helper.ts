import { FeatureFlag } from '@quantumdeal/db/schema';
import { UserContext } from '@quantumdeal/framework/interfaces';
import { hasFeature } from '@quantumdeal/framework/interfaces';

/**
 * Feature Access Helpers
 *
 * Helper functions for checking feature access in Telegraf handlers.
 * Use these for manual feature checks since guards don't work with Telegraf decorators.
 */

/**
 * Check if user has required feature in handler
 *
 * Returns true if user has the feature, false otherwise.
 * Use this at the start of your handler to verify access.
 *
 * Usage:
 * ```typescript
 * @Command('filter')
 * async handleFilter(@Ctx() ctx: UserContext) {
 *   if (!checkFeatureAccess(ctx, FeatureFlag.CUSTOM_USER_FILTERING)) {
 *     await sendFeatureNotAvailable(ctx, FeatureFlag.CUSTOM_USER_FILTERING);
 *     return;
 *   }
 *   // User has access - continue with handler
 * }
 * ```
 *
 * @param ctx - Telegraf context with user
 * @param feature - Required feature
 * @returns true if user has the feature
 */
export function checkFeatureAccess(
  ctx: UserContext,
  feature: FeatureFlag,
): boolean {
  if (!ctx.user) {
    return false;
  }
  return hasFeature(ctx.user, feature);
}

/**
 * Send feature not available message with upgrade CTA
 *
 * Sends a user-friendly message explaining the feature is not available
 * and provides information about upgrading.
 *
 * Usage:
 * ```typescript
 * if (!checkFeatureAccess(ctx, FeatureFlag.CUSTOM_USER_FILTERING)) {
 *   await sendFeatureNotAvailable(ctx, FeatureFlag.CUSTOM_USER_FILTERING);
 *   return;
 * }
 * ```
 *
 * @param ctx - Telegraf context
 * @param feature - The feature that's not available
 */
export async function sendFeatureNotAvailable(
  ctx: UserContext,
  feature: FeatureFlag,
): Promise<void> {
  let message: string;

  if (feature === FeatureFlag.TIER_BASED_FILTERING) {
    // This should rarely happen as TIER_BASED_FILTERING is available to all tiers
    message = `
❌ Feature Not Available

Tier-based filtering is not available in your current subscription.

NOTE: All active subscribers receive trading signals.

Please contact support if you see this message.
`.trim();
  } else if (feature === FeatureFlag.CUSTOM_USER_FILTERING) {
    message = `
❌ Custom Filtering Not Available

Custom user filtering is only available for VIP subscribers.

Your current subscription includes:
• ✅ Trading signals (all tiers)
• ✅ Tier-based filtering (system-controlled by subscription)

✨ Upgrade to VIP to unlock:
• Custom user filtering (choose specific instruments)
• Personalize which signals you receive

Use /upgrade to learn more about VIP benefits.
`.trim();
  } else {
    message = '❌ This feature is not available in your subscription.';
  }

  await ctx.reply(message);
}
