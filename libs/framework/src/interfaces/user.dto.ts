import { FeatureFlag, FeatureConfig } from '@quantumdeal/db/schema';

/**
 * Active Subscription DTO
 *
 * Represents a user's active subscription with all relevant details.
 * This DTO is used to provide subscription information in the user context.
 */
export interface ActiveSubscriptionDto {
  /**
   * Unique identifier of the subscription
   */
  subscriptionId: number;

  /**
   * Subscription name (e.g., "VIP Signals", "Premium Package")
   */
  name: string;

  /**
   * Subscription type
   * - 'signals': Standard signals subscription
   * - 'subscription_{uid}': Broadcast subscription with unique identifier
   */
  type: string;

  /**
   * Date when the subscription was activated
   */
  activatedAt: Date;

  /**
   * Date when the subscription expires (null for lifetime subscriptions)
   */
  expiresAt: Date | null;

  /**
   * Whether the subscription is currently active
   */
  isActive: boolean;
}

/**
 * User with Subscriptions DTO
 *
 * Enhanced user data transfer object that includes active subscriptions and feature flags.
 * This replaces the old User type that relied on the deprecated subscribeId field.
 *
 * Migration Note:
 * - Removed: subscribeId (one-to-one relationship field)
 * - Removed: subscribeExpirationDate (replaced by expiresAt in activeSubscriptions)
 * - Added: activeSubscriptions array (supports many-to-many relationship)
 * - Added: enabledFeatures set (feature flags from subscriptions)
 * - Added: featureConfigs map (feature-specific configurations)
 */
export interface UserWithSubscriptions {
  /**
   * Bot user ID (internal auto-generated ID, NOT telegramId)
   */
  botUserId: number;

  /**
   * Telegram user ID (primary key)
   */
  telegramId: number;

  /**
   * Telegram username (without @)
   */
  username: string | null;

  /**
   * User's first name
   */
  firstName: string | null;

  /**
   * User's last name
   */
  lastName: string | null;

  /**
   * User's language preference (ISO code, e.g., 'en', 'ru')
   */
  lang: string | null;

  /**
   * Whether the user has Telegram Premium
   */
  isPremium: boolean;

  /**
   * Whether the user account is active
   */
  isActive: boolean;

  /**
   * Date when the user was created
   */
  createdAt: Date;

  /**
   * Array of user's active subscriptions
   * Empty array if user has no active subscriptions
   */
  activeSubscriptions: ActiveSubscriptionDto[];

  /**
   * Set of enabled feature flags (aggregated from all active subscriptions)
   * Loaded by UserManagementMiddleware via FeatureFlagService
   */
  enabledFeatures: Set<FeatureFlag>;

  /**
   * Map of feature-specific configurations
   * Loaded by UserManagementMiddleware via FeatureFlagService
   */
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
}

/**
 * Helper function to check if user has a specific feature
 *
 * Use this for conditional logic and UI rendering.
 * For enforcing access control, use @RequireFeature decorator.
 *
 * @param user - User with subscriptions and features
 * @param feature - The feature to check
 * @returns true if user has the feature enabled
 */
export function hasFeature(
  user: UserWithSubscriptions,
  feature: FeatureFlag,
): boolean {
  return user.enabledFeatures.has(feature);
}
