import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, and, like } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  subscriptions,
  Subscription,
  NewSubscription,
  isBroadcastSubscription,
} from '../schema/subscriptions';
import { subscriptionFeatures } from '../schema/subscription-features';
import { users } from '../schema/users';
import { userSubscriptions } from '../schema/user-subscriptions';
import { botUsers } from '../schema/bot-users';

/**
 * Extended subscription interface that includes feature flag information
 * and user details for webhook processing
 */
export interface SubscriptionWithFeatures {
  // Subscription fields
  subscriptionId: number;
  subscriptionName: string;
  subscriptionIsActive: boolean;

  // Feature flag: hasCustomFiltering
  hasCustomFiltering: boolean;

  // User fields
  botUserId: number;
  botId: number;
  userTelegramId: string;
  userFirstName: string;
  userLastName: string | null;
  userUsername: string | null;
  userLang: string | null;

  // UserSubscription fields
  userSubscriptionId: number;
  userSubscriptionActivatedAt: Date;
  userSubscriptionExpiresAt: Date | null;
  userSubscriptionEndDate: Date | null; // For backward compatibility with webhook
  userSubscriptionIsActive: boolean;
}

@Injectable()
export class SubscriptionsRepository extends BaseRepository<
  Subscription,
  NewSubscription,
  number
> {
  protected table = subscriptions;
  protected idColumn = subscriptions.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find subscriptions with users that have TIER_BASED_FILTERING feature enabled
   * for a specific sector, including hasCustomFiltering flag for webhook filtering.
   *
   * This method returns user-subscription pairs with feature flag information,
   * enabling the webhook processor to apply custom filtering per user.
   *
   * @param sector - The sector to filter by (e.g., 'crypto', 'forex', 'stocks')
   * @returns Array of user-subscription pairs with feature flags
   */
  async findBySector(sector: string): Promise<SubscriptionWithFeatures[]> {
    // Alias for tier-based filtering join
    const sfTier = subscriptionFeatures;

    const result = await this.db
      .select({
        // Subscription fields
        subscriptionId: subscriptions.id,
        subscriptionName: subscriptions.name,
        subscriptionIsActive: subscriptions.isActive,

        // Feature flag: hasCustomFiltering (using subquery to avoid duplicate rows)
        hasCustomFiltering: sql<boolean>`
          COALESCE(
            (SELECT sf_custom.is_enabled
             FROM ${subscriptionFeatures} sf_custom
             WHERE sf_custom.subscription_id = ${subscriptions.id}
             AND sf_custom.feature_key = 'custom_user_filtering'
             AND sf_custom.is_enabled = true
            ), false
          )
        `,

        // User fields
        botUserId: botUsers.id,
        botId: botUsers.botId,
        userTelegramId: sql<string>`CAST(${users.telegramId} AS TEXT)`,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userUsername: users.username,
        userLang: botUsers.lang,

        // UserSubscription fields
        userSubscriptionId: userSubscriptions.id,
        userSubscriptionActivatedAt: userSubscriptions.activatedAt,
        userSubscriptionExpiresAt: userSubscriptions.expiresAt,
        userSubscriptionEndDate: userSubscriptions.expiresAt, // Alias for backward compatibility
        userSubscriptionIsActive: userSubscriptions.isActive,
      })
      .from(subscriptions)
      .innerJoin(
        sfTier,
        and(
          eq(sfTier.subscriptionId, subscriptions.id),
          eq(sfTier.featureKey, 'tier_based_filtering'),
        ),
      )
      .innerJoin(
        userSubscriptions,
        and(
          eq(userSubscriptions.subscriptionId, subscriptions.id),
          eq(userSubscriptions.isActive, true),
        ),
      )
      .innerJoin(botUsers, eq(botUsers.userId, userSubscriptions.botUserId))
      .innerJoin(users, eq(users.telegramId, botUsers.userId))
      .where(
        and(
          // Check if sector is in the tier_access config's sectors array
          // Supports wildcard '*' for all sectors
          sql`(
            ${sfTier.config}::jsonb->'sectors' ? ${sector}
            OR
            ${sfTier.config}::jsonb->'sectors' ? '*'
          )`,
          eq(sfTier.isEnabled, true),
          eq(subscriptions.isActive, true),
          // Only active user subscriptions that haven't expired
          sql`${userSubscriptions.expiresAt} > NOW()`,
        ),
      );

    return result as SubscriptionWithFeatures[];
  }

  /**
   * Find subscriptions for a specific bot and sector.
   * Used by MultiBotSignalService for per-bot signal delivery (ADR-007).
   *
   * @param sector - Signal sector (e.g., 'crypto', 'forex')
   * @param botId - Database bot ID (null for static bot QuantumDealBot)
   * @returns Array of user-subscription pairs for the specified bot
   */
  async findBySectorForBot(
    sector: string,
    botId: number | null,
  ): Promise<SubscriptionWithFeatures[]> {
    // Alias for tier-based filtering join
    const sfTier = subscriptionFeatures;

    const result = await this.db
      .select({
        // Subscription fields
        subscriptionId: subscriptions.id,
        subscriptionName: subscriptions.name,
        subscriptionIsActive: subscriptions.isActive,

        // Feature flag: hasCustomFiltering (using subquery)
        hasCustomFiltering: sql<boolean>`
          COALESCE(
            (SELECT sf_custom.is_enabled
             FROM ${subscriptionFeatures} sf_custom
             WHERE sf_custom.subscription_id = ${subscriptions.id}
             AND sf_custom.feature_key = 'custom_user_filtering'
             AND sf_custom.is_enabled = true
            ), false
          )
        `,

        // User fields
        botUserId: botUsers.id,
        botId: botUsers.botId,
        userTelegramId: sql<string>`CAST(${botUsers.userId} AS TEXT)`,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userUsername: users.username,
        userLang: botUsers.lang,

        // UserSubscription fields
        userSubscriptionId: userSubscriptions.id,
        userSubscriptionActivatedAt: userSubscriptions.activatedAt,
        userSubscriptionExpiresAt: userSubscriptions.expiresAt,
        userSubscriptionEndDate: userSubscriptions.expiresAt,
        userSubscriptionIsActive: userSubscriptions.isActive,
      })
      .from(subscriptions)
      .innerJoin(
        sfTier,
        and(
          eq(sfTier.subscriptionId, subscriptions.id),
          eq(sfTier.featureKey, 'tier_based_filtering'),
        ),
      )
      .innerJoin(
        userSubscriptions,
        and(
          eq(userSubscriptions.subscriptionId, subscriptions.id),
          eq(userSubscriptions.isActive, true),
          // Bot-specific filter: match botId or IS NULL for static bot
          botId === null
            ? sql`${userSubscriptions.botId} IS NULL`
            : eq(userSubscriptions.botId, botId),
        ),
      )
      .innerJoin(users, eq(users.telegramId, userSubscriptions.userId))
      .where(
        and(
          // Sector filter with wildcard support
          sql`(
            ${sfTier.config}::jsonb->'sectors' ? ${sector}
            OR
            ${sfTier.config}::jsonb->'sectors' ? '*'
          )`,
          eq(sfTier.isEnabled, true),
          eq(subscriptions.isActive, true),
          // Only active, non-expired subscriptions
          sql`${userSubscriptions.expiresAt} > NOW()`,
        ),
      );

    return result as SubscriptionWithFeatures[];
  }

  /**
   * Find all active broadcast subscriptions
   * CRITICAL: Filters by type LIKE 'subscription_%'
   *
   * @returns Array of active broadcast subscriptions
   */
  async findActiveBroadcastSubscriptions(): Promise<Subscription[]> {
    return this.findBy(
      and(
        eq(this.table.isActive, true),
        like(this.table.type, 'subscription_%'),
      ),
    );
  }

  /**
   * Find all broadcast subscriptions (active and inactive)
   * CRITICAL: Filters by type LIKE 'subscription_%'
   *
   * @returns Array of all broadcast subscriptions
   */
  async findAllBroadcastSubscriptions(): Promise<Subscription[]> {
    return this.findBy(like(this.table.type, 'subscription_%'));
  }

  /**
   * Check if a subscription is a broadcast subscription by ID
   *
   * @param id - The subscription ID
   * @returns true if the subscription is a broadcast subscription
   */
  async isBroadcastSubscriptionById(id: number): Promise<boolean> {
    const subscription = await this.findById(id);
    if (!subscription) {
      return false;
    }
    return isBroadcastSubscription(subscription.type);
  }

  /**
   * Update the active status of a subscription (soft delete/restore)
   *
   * @param id - The subscription ID
   * @param isActive - The new active status
   * @returns The updated subscription
   */
  async updateStatus(
    id: number,
    isActive: boolean,
  ): Promise<Subscription | null> {
    return this.update(id, { isActive });
  }

  /**
   * Close a subscription (mark as inactive with audit trail)
   * Used when a manager closes a broadcast subscription
   *
   * @param id - The subscription ID
   * @param managerId - The manager's Telegram ID who is closing the subscription
   * @returns The updated subscription
   */
  async closeSubscription(
    id: number,
    managerId: number,
  ): Promise<Subscription | null> {
    const now = new Date();
    return this.update(id, {
      isActive: false,
      closedAt: now,
      closedBy: managerId,
    });
  }

  /**
   * Reopen a closed subscription (restore to active status)
   *
   * @param id - The subscription ID
   * @returns The updated subscription
   */
  async reopenSubscription(id: number): Promise<Subscription | null> {
    return this.update(id, {
      isActive: true,
      closedAt: null,
      closedBy: null,
    });
  }

  /**
   * Find the signals subscription (the default subscription type)
   *
   * @returns The signals subscription or null if not found
   */
  async findSignalsSubscription(): Promise<Subscription | null> {
    return this.findOneBy(eq(this.table.type, 'signals'));
  }

  /**
   * Find all active subscriptions (both signals and broadcast)
   *
   * @returns Array of active subscriptions
   */
  async findActiveSubscriptions(): Promise<Subscription[]> {
    return this.findBy(
      and(eq(this.table.isActive, true), eq(this.table.isHidden, false)),
    );
  }

  /**
   * Find subscription by name
   *
   * @param name - The subscription name
   * @returns The subscription or null if not found
   */
  async findByName(name: string): Promise<Subscription | null> {
    return this.findOneBy(eq(this.table.name, name));
  }

  /**
   * Find the trial subscription using feature flag
   * Searches for subscription with is_trial=true feature flag
   *
   * @returns The trial subscription or null if not found
   */
  async findTrialSubscription(): Promise<Subscription | null> {
    const result = await this.db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        scope: subscriptions.scope,
        type: subscriptions.type,
        isActive: subscriptions.isActive,
        isHidden: subscriptions.isHidden,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        closedAt: subscriptions.closedAt,
        closedBy: subscriptions.closedBy,
      })
      .from(subscriptions)
      .innerJoin(
        subscriptionFeatures,
        eq(subscriptionFeatures.subscriptionId, subscriptions.id),
      )
      .where(
        and(
          eq(subscriptionFeatures.featureKey, 'is_trial'),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      )
      .limit(1);

    return result.length > 0 ? (result[0] as Subscription) : null;
  }

  /**
   * Check if a subscription is a trial subscription
   * Checks if the subscription has is_trial feature flag enabled
   *
   * @param subscriptionId - The subscription ID to check
   * @returns true if the subscription is a trial subscription
   */
  async isTrialSubscription(subscriptionId: number): Promise<boolean> {
    const result = await this.db
      .select({
        isEnabled: subscriptionFeatures.isEnabled,
      })
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, 'is_trial'),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      )
      .limit(1);

    return result.length > 0 && result[0].isEnabled === true;
  }
}
