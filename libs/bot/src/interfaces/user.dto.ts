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
 * Helper type guard to check if user has any active subscriptions
 */
export function hasActiveSubscriptions(user: UserWithSubscriptions): boolean {
  return user.activeSubscriptions.length > 0;
}

/**
 * Helper function to check if user has a specific subscription type
 */
export function hasSubscriptionType(
  user: UserWithSubscriptions,
  type: string,
): boolean {
  return user.activeSubscriptions.some(
    (sub) => sub.type === type && sub.isActive,
  );
}

/**
 * Helper function to get active subscription by type
 */
export function getActiveSubscriptionByType(
  user: UserWithSubscriptions,
  type: string,
): ActiveSubscriptionDto | undefined {
  return user.activeSubscriptions.find(
    (sub) => sub.type === type && sub.isActive,
  );
}

/**
 * Helper function to check if user has any signals subscription
 */
export function hasSignalsSubscription(user: UserWithSubscriptions): boolean {
  return hasSubscriptionType(user, 'signals');
}

/**
 * Helper function to check if user has any broadcast subscription
 */
export function hasBroadcastSubscription(user: UserWithSubscriptions): boolean {
  return user.activeSubscriptions.some(
    (sub) => sub.type.startsWith('subscription_') && sub.isActive,
  );
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

/**
 * Helper function to get feature configuration
 *
 * Returns the configuration object for a feature if user has it enabled.
 * Useful for getting feature-specific settings.
 *
 * @param user - User with subscriptions and features
 * @param feature - The feature to get config for
 * @returns Feature configuration or null if not enabled
 */
export function getFeatureConfig<T = FeatureConfig>(
  user: UserWithSubscriptions,
  feature: FeatureFlag,
): T | null {
  const config = user.featureConfigs.get(feature);
  return (config as T) || null;
}

/**
 * Helper function to check if user has multiple features
 *
 * Returns true only if user has ALL specified features.
 *
 * @param user - User with subscriptions and features
 * @param features - Array of features to check
 * @returns true if user has all features
 */
export function hasAllFeatures(
  user: UserWithSubscriptions,
  features: FeatureFlag[],
): boolean {
  return features.every((feature) => user.enabledFeatures.has(feature));
}

/**
 * Helper function to check if user has any of the specified features
 *
 * Returns true if user has AT LEAST ONE of the specified features.
 *
 * @param user - User with subscriptions and features
 * @param features - Array of features to check
 * @returns true if user has at least one feature
 */
export function hasAnyFeature(
  user: UserWithSubscriptions,
  features: FeatureFlag[],
): boolean {
  return features.some((feature) => user.enabledFeatures.has(feature));
}
