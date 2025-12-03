import { Injectable, Inject, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  userSubscriptions,
  UserSubscription,
  NewUserSubscription,
} from '../schema/user-subscriptions';
import { users, User } from '../schema/users';
import { subscriptions, Subscription } from '../schema/subscriptions';
import { BotUser, botUsers } from '../schema/bot-users';
import { eq, and, sql, like } from 'drizzle-orm';

/**
 * Repository for managing user subscription relationships
 *
 * This repository handles the many-to-many relationship between users and subscriptions,
 * replacing the old one-to-one relationship (users.subscribeId) and code activation data
 * (codes.userId, codes.activationDate, codes.expirationDate).
 *
 * It supports both:
 * - Signals subscriptions (type: 'signals')
 * - Broadcast subscriptions (type: 'subscription_{uid}')
 */
@Injectable()
export class UserSubscriptionsRepository extends BaseRepository<
  UserSubscription,
  NewUserSubscription,
  number
> {
  protected table = userSubscriptions;
  protected idColumn = userSubscriptions.id;
  private readonly logger = new Logger(UserSubscriptionsRepository.name);

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find all users subscribed to a specific subscription
   * @param subscriptionId - The subscription ID
   * @returns Array of user subscriptions
   */
  async findBySubscriptionId(
    subscriptionId: number,
  ): Promise<UserSubscription[]> {
    return this.findBy(eq(this.table.subscriptionId, subscriptionId));
  }

  /**
   * Find all active users subscribed to a specific subscription
   * @param subscriptionId - The subscription ID
   * @returns Array of active user subscriptions
   */
  async findActiveBySubscriptionId(subscriptionId: number) {
    return this.findSubscribersWithUserDetails(subscriptionId);
  }

  /**
   * Find subscriptions expiring in exactly N days from now
   * Replaces UsersRepository.findUsersWithExpiringSubscriptions()
   *
   * @param daysFromNow - Number of days from now (0 = today, 3 = 3 days from now, etc.)
   * @param subscriptionType - Optional filter by subscription type ('signals' or 'subscription_%')
   * @returns Array of objects containing user, subscription, and userSubscription data
   */
  async findExpiring(
    daysFromNow: number,
    subscriptionType?: string,
  ): Promise<
    Array<{
      botUser: BotUser;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  > {
    const conditions = [
      eq(this.table.isActive, true),
      eq(botUsers.isActive, true),
      sql`${this.table.expiresAt} IS NOT NULL`,
      sql`${this.table.expiresAt}::date = CURRENT_DATE + ${daysFromNow}::int`,
    ];

    // Add optional subscription type filter
    if (subscriptionType) {
      if (subscriptionType === 'signals') {
        conditions.push(eq(subscriptions.type, 'signals'));
      } else if (subscriptionType.startsWith('subscription_')) {
        conditions.push(eq(subscriptions.type, subscriptionType));
      } else {
        // Filter for all broadcast subscriptions
        conditions.push(like(subscriptions.type, 'subscription_%'));
      }
    }

    const result = await this.db
      .select({
        botUser: botUsers,
        subscription: subscriptions,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(botUsers, eq(this.table.botUserId, botUsers.id))
      .innerJoin(subscriptions, eq(this.table.subscriptionId, subscriptions.id))
      .where(and(...conditions));

    return result;
  }

  /**
   * Find all active users with active subscriptions (non-expired)
   * Replaces UsersRepository.findActiveUsersWithActiveSubscription()
   *
   * @param subscriptionType - Optional filter by subscription type ('signals' or 'subscription_%')
   * @returns Array of objects containing user, subscription, and userSubscription data
   */
  async findActiveUsersWithActiveWithSubscriptionId(
    subscriptionId: number,
  ): Promise<
    Array<{
      botUser: BotUser;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  > {
    const now = new Date();
    const conditions = [
      eq(this.table.isActive, true),
      eq(botUsers.isActive, true),
      eq(subscriptions.isActive, true),
      eq(this.table.subscriptionId, subscriptionId),
      sql`${this.table.expiresAt} IS NOT NULL`,
      sql`${this.table.expiresAt} >= ${now}`,
    ];

    const result = await this.db
      .select({
        botUser: botUsers,
        subscription: subscriptions,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(botUsers, eq(this.table.botUserId, botUsers.id))
      .innerJoin(subscriptions, eq(this.table.subscriptionId, subscriptions.id))
      .where(and(...conditions));

    return result;
  }

  /**
   * Find all active users with active subscriptions (non-expired)
   * Replaces UsersRepository.findActiveUsersWithActiveSubscription()
   *
   * @param subscriptionType - Optional filter by subscription type ('signals' or 'subscription_%')
   * @returns Array of objects containing user, subscription, and userSubscription data
   */
  async findActiveUsersWithActiveSubscription(
    subscriptionType?: string,
  ): Promise<
    Array<{
      botUser: BotUser;
      user: User;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  > {
    const now = new Date();
    const conditions = [
      eq(this.table.isActive, true),
      eq(botUsers.isActive, true),
      eq(subscriptions.isActive, true),
      sql`${this.table.expiresAt} IS NOT NULL`,
      sql`${this.table.expiresAt} >= ${now}`,
    ];

    // Add optional subscription type filter
    if (subscriptionType) {
      if (subscriptionType === 'signals') {
        conditions.push(eq(subscriptions.type, 'signals'));
      } else if (subscriptionType.startsWith('subscription_')) {
        conditions.push(eq(subscriptions.type, subscriptionType));
      } else {
        // Filter for all broadcast subscriptions
        conditions.push(like(subscriptions.type, 'subscription_%'));
      }
    }

    const result = await this.db
      .select({
        user: users,
        botUser: botUsers,
        subscription: subscriptions,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(botUsers, eq(this.table.botUserId, botUsers.id))
      .innerJoin(users, eq(botUsers.userId, users.telegramId))
      .innerJoin(subscriptions, eq(this.table.subscriptionId, subscriptions.id))
      .where(and(...conditions));

    return result;
  }

  /**
   * Find users subscribed to a specific subscription with full user details
   * Useful for broadcast operations
   *
   * @param subscriptionId - The subscription ID
   * @returns Array of objects containing user and userSubscription data
   */
  async findSubscribersWithUserDetails(subscriptionId: number): Promise<
    Array<{
      botUser: BotUser;
      userSubscription: UserSubscription;
    }>
  > {
    console.log('subscriptionId', subscriptionId);
    const result = await this.db
      .select({
        botUser: botUsers,
        user: users,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(botUsers, eq(this.table.botUserId, botUsers.id))
      .innerJoin(users, eq(botUsers.userId, users.telegramId))
      .where(
        and(
          eq(this.table.subscriptionId, subscriptionId),
          eq(this.table.isActive, true),
          eq(botUsers.isActive, true),
        ),
      );

    return result;
  }

  /**
   * Deactivate all other subscriptions of the same type for a user
   * Used when switching to a new subscription or renewing current one
   *
   * Only deactivates subscriptions of the same type (signals vs broadcast)
   * This allows users to have one active signals subscription AND one broadcast subscription
   *
   * @param userId - User ID
   * @param keepActiveUserSubscriptionId - User subscription ID to keep active
   * @param subscriptionType - Type of subscription ('signals' or 'subscription_{uid}')
   */
  async deactivateOtherSubscriptionsOfSameType(
    botUserId: number,
    keepActiveUserSubscriptionId: number,
    subscriptionType: string,
  ): Promise<void> {
    // Determine if this is a signals or broadcast subscription
    const isSignals = subscriptionType === 'signals';
    const typeCondition = isSignals
      ? sql`s.type = 'signals'`
      : sql`s.type LIKE 'subscription_%'`;

    // Deactivate other subscriptions of the same type using JOIN
    await this.db.execute(sql`
      UPDATE ${this.table} AS us
      SET is_active = false
      FROM ${subscriptions} AS s
      WHERE us.subscription_id = s.id
        AND us.bot_user_id = ${botUserId}
        AND us.id != ${keepActiveUserSubscriptionId}
        AND ${typeCondition}
    `);

    this.logger.log(
      `Deactivated other ${isSignals ? 'signals' : 'broadcast'} subscriptions for user ${botUserId}, keeping user_subscription ${keepActiveUserSubscriptionId} active`,
    );
  }

  /**
   * Extend subscription expiry date by adding days
   * Used for subscription renewal via payment
   *
   * If subscription is already expired, extends from current date
   * If subscription is active, extends from current expiry date
   * Automatically reactivates expired subscriptions and deactivates other user subscriptions of the same type
   *
   * @param userSubscriptionId - User subscription ID
   * @param additionalDays - Number of days to add
   * @returns Updated subscription or null if not found
   */
  async extendSubscription(
    userSubscriptionId: number,
    additionalDays: number,
  ): Promise<UserSubscription | null> {
    // First, get the user subscription with subscription details
    const currentSubData = await this.db
      .select({
        userSub: this.table,
        subscription: subscriptions,
      })
      .from(this.table)
      .leftJoin(subscriptions, eq(this.table.subscriptionId, subscriptions.id))
      .where(eq(this.table.id, userSubscriptionId))
      .limit(1);

    if (
      !currentSubData ||
      currentSubData.length === 0 ||
      !currentSubData[0].subscription
    ) {
      this.logger.warn(`Subscription ${userSubscriptionId} not found`);
      return null;
    }

    const { userSub, subscription } = currentSubData[0];

    // Deactivate all other subscriptions of the same type for this user
    await this.deactivateOtherSubscriptionsOfSameType(
      userSub.botUserId ?? 0,
      userSubscriptionId,
      subscription.type,
    );

    // Now extend and activate this subscription
    const result = await this.db
      .update(this.table)
      .set({
        expiresAt: sql`
          CASE
            WHEN ${this.table.expiresAt} > NOW()
            THEN ${this.table.expiresAt} + INTERVAL '${sql.raw(additionalDays.toString())} days'
            ELSE NOW() + INTERVAL '${sql.raw(additionalDays.toString())} days'
          END
        `,
        isActive: true, // Reactivate if expired
      })
      .where(eq(this.table.id, userSubscriptionId))
      .returning();

    return result[0] || null;
  }

  /**
   * Find expired trial subscriptions for reminder notifications
   * Used by ReminderSchedulerService to send daily reminders
   *
   * @param botId - The bot ID to filter by
   * @returns Array of objects containing user and userSubscription data
   */
  async findExpiredTrials(botId: number): Promise<
    Array<{
      botUser: BotUser;
      userSubscription: UserSubscription;
    }>
  > {
    const now = new Date();
    const result = await this.db
      .select({
        botUser: botUsers,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(botUsers, eq(this.table.botUserId, botUsers.id))
      .where(
        and(
          eq(this.table.botId, botId),
          eq(this.table.isActive, false),
          sql`${this.table.expiresAt} IS NOT NULL`,
          sql`${this.table.expiresAt} < ${now}`,
          eq(botUsers.isActive, true),
        ),
      );

    return result;
  }

  // ============================================================================
  // botUserId Methods (New API - References bot_users.id)
  // These methods use botUserId which is the internal auto-generated ID from
  // the bot_users table, NOT the telegramId. This enables per-bot subscription
  // isolation following the multi-bot architecture (ADR-004).
  // ============================================================================

  /**
   * Find all subscriptions for a specific bot user
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @returns Array of user subscriptions for this bot user
   */
  async findByBotUserId(botUserId: number): Promise<UserSubscription[]> {
    return this.findBy(eq(this.table.botUserId, botUserId));
  }

  /**
   * Find all active (non-expired) subscriptions for a specific bot user
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @returns Array of active, non-expired user subscriptions
   */
  async findActiveByBotUserId(botUserId: number): Promise<UserSubscription[]> {
    return this.findBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.isActive, true),
        sql`${this.table.expiresAt} IS NOT NULL`,
        sql`${this.table.expiresAt} >= ${new Date()}`,
      ),
    );
  }

  /**
   * Find user subscription by bot user ID and subscription ID
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @param subscriptionId - The subscription ID
   * @returns User subscription or null if not found
   */
  async findByBotUserAndSubscription(
    botUserId: number,
    subscriptionId: number,
  ): Promise<UserSubscription | null> {
    const result = await this.findBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );
    return result[0] ?? null;
  }

  /**
   * Find active user subscriptions with full subscription details for a bot user
   * Returns joined data: userSubscription + subscription
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @returns Array of objects containing userSubscription and subscription
   */
  async findActiveByBotUserIdWithSubscription(botUserId: number): Promise<
    Array<{
      userSubscription: UserSubscription;
      subscription: Subscription;
    }>
  > {
    const result = await this.db
      .select({
        userSubscription: this.table,
        subscription: subscriptions,
      })
      .from(this.table)
      .innerJoin(subscriptions, eq(this.table.subscriptionId, subscriptions.id))
      .where(
        and(eq(this.table.botUserId, botUserId), eq(this.table.isActive, true)),
      );

    return result;
  }

  /**
   * Check if a bot user is subscribed to a specific subscription (active or inactive)
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @param subscriptionId - The subscription ID
   * @returns true if the bot user has any subscription record
   */
  async isBotUserSubscribed(
    botUserId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );
    return result !== null;
  }

  /**
   * Check if a bot user has an active subscription to a specific subscription
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @param subscriptionId - The subscription ID
   * @returns true if the bot user has an active subscription
   */
  async hasActiveSubscriptionByBotUser(
    botUserId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
      ),
    );
    return result !== null;
  }

  /**
   * Activate a subscription for a bot user
   * - If subscription doesn't exist: create it with the provided expiration date
   * - If subscription exists and is active (not expired): extend by adding days to current expiration
   * - If subscription exists but is expired/inactive: reactivate with new expiration from now
   *
   * Note: During the transition period, this method looks up the userId (telegramId) from
   * the bot_users table to satisfy the NOT NULL constraint on user_subscriptions.userId.
   * This will be simplified once userId is removed in a future migration.
   *
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @param subscriptionId - The subscription ID
   * @param expiresAt - Optional expiration date (typically 30 days from now for new codes)
   * @returns The created or updated user subscription
   * @throws Error if botUserId doesn't correspond to a valid bot_users record
   */
  async activateForBotUser(
    botUserId: number,
    subscriptionId: number,
    expiresAt?: Date,
  ): Promise<UserSubscription> {
    // Check if subscription already exists
    const existing = await this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );

    if (existing) {
      // Subscription exists - extend or reactivate it
      let newExpiresAt: Date | undefined;

      if (existing.expiresAt) {
        const now = new Date();
        const existingExpiry = new Date(existing.expiresAt);

        if (existingExpiry > now && existing.isActive) {
          // Active subscription - extend by adding days to current expiration
          if (expiresAt) {
            // Calculate days to add from the provided expiration date
            const daysToAdd = Math.ceil(
              (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            newExpiresAt = new Date(existingExpiry);
            newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);
          } else {
            // No new expiration provided, keep existing
            newExpiresAt = existing.expiresAt;
          }
        } else {
          // Expired or inactive - use new expiration (start from now)
          newExpiresAt = expiresAt ?? existing.expiresAt;
        }
      } else {
        // No existing expiration - use new one
        newExpiresAt = expiresAt;
      }

      const updated = await this.db
        .update(this.table)
        .set({
          isActive: true,
          expiresAt: newExpiresAt,
          activatedAt: new Date(),
        })
        .where(
          and(
            eq(this.table.botUserId, botUserId),
            eq(this.table.subscriptionId, subscriptionId),
          ),
        )
        .returning();

      return updated[0];
    } else {
      // Subscription doesn't exist - create it
      // Look up userId (telegramId) from bot_users to satisfy the NOT NULL constraint
      // This is needed during the transition period while userId is still required
      const botUserResult = await this.db
        .select({ userId: botUsers.userId, botId: botUsers.botId })
        .from(botUsers)
        .where(eq(botUsers.id, botUserId))
        .limit(1);

      if (!botUserResult[0]) {
        throw new Error(
          `Cannot create subscription: bot_users record not found for botUserId ${botUserId}`,
        );
      }

      const { botId } = botUserResult[0];

      return this.create({
        botUserId,
        botId,
        subscriptionId,
        expiresAt,
        isActive: true,
      });
    }
  }

  /**
   * Deactivate a bot user's subscription (soft delete)
   * @param botUserId - The bot_users.id (internal auto-generated ID, NOT telegramId)
   * @param subscriptionId - The subscription ID
   * @returns void
   */
  async deactivateForBotUser(
    botUserId: number,
    subscriptionId: number,
  ): Promise<void> {
    await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(
        and(
          eq(this.table.botUserId, botUserId),
          eq(this.table.subscriptionId, subscriptionId),
        ),
      );
  }
}
