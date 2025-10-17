import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '@quantumdeal/db/schema';

/**
 * Metadata key for RequireFeature decorator
 */
export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Decorator to require a specific feature for a handler
 *
 * This decorator marks a command handler or action handler to require
 * a specific feature flag. Use with FeatureGuard to enforce access control.
 *
 * Usage:
 * ```typescript
 * @Command('filter')
 * @RequireFeature(FeatureFlag.CUSTOM_USER_FILTERING)
 * async handleFilterCommand(@Ctx() ctx: UserContext) {
 *   // Only users with CUSTOM_USER_FILTERING can access
 *   // If user doesn't have the feature, FeatureGuard will block access
 * }
 * ```
 *
 * Note: This decorator only sets metadata. You must apply FeatureGuard
 * to actually enforce the check. For Telegraf handlers, use the feature
 * check helper instead since guards don't work with Telegraf decorators.
 *
 * @param feature - The required feature flag
 * @returns SetMetadata decorator
 */
export const RequireFeature = (feature: FeatureFlag) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
