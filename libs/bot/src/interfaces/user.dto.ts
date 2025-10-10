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
 * Enhanced user data transfer object that includes active subscriptions.
 * This replaces the old User type that relied on the deprecated subscribeId field.
 *
 * Migration Note:
 * - Removed: subscribeId (one-to-one relationship field)
 * - Removed: subscribeExpirationDate (replaced by expiresAt in activeSubscriptions)
 * - Added: activeSubscriptions array (supports many-to-many relationship)
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
