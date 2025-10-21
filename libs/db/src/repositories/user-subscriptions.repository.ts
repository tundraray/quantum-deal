import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  userSubscriptions,
  UserSubscription,
  NewUserSubscription,
} from '../schema/user-subscriptions';
import { users, User } from '../schema/users';
import { subscriptions, Subscription } from '../schema/subscriptions';
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

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find all subscriptions for a specific user
   * @param userId - The user's Telegram ID
   * @returns Array of user subscriptions
   */
  async findByUserId(userId: number): Promise<UserSubscription[]> {
    return this.findBy(eq(this.table.userId, userId));
  }

  /**
   * Find all active subscriptions for a specific user
   * @param userId - The user's Telegram ID
   * @returns Array of active user subscriptions
   */
  async findActiveByUserId(userId: number): Promise<UserSubscription[]> {
    return this.findBy(
      and(eq(this.table.userId, userId), eq(this.table.isActive, true)),
    );
  }

  /**
   * Find active user subscriptions with full subscription details
   * Returns joined data: userSubscription + subscription
   * @param userId - The user's Telegram ID
   * @returns Array of objects containing userSubscription and subscription
   */
  async findActiveByUserIdWithSubscription(userId: number): Promise<
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
      .where(and(eq(this.table.userId, userId), eq(this.table.isActive, true)));

    return result;
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
   * Check if a user is subscribed to a specific subscription
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns true if the user is subscribed (active or inactive)
   */
  async isUserSubscribed(
    userId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(this.table.userId, userId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );
    return result !== null;
  }

  /**
   * Check if a user has an active subscription to a specific subscription
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns true if the user has an active subscription
   */
  async hasActiveSubscription(
    userId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(this.table.userId, userId),
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
      ),
    );
    return result !== null;
  }

  /**
   * Activate a subscription for a user
   * - If subscription doesn't exist: create it with the provided expiration date
   * - If subscription exists and is active (not expired): extend by adding days to current expiration
   * - If subscription exists but is expired/inactive: reactivate with new expiration from now
   *
   * Example: User has subscription until Nov 1, 2025 (active)
   *          Activates code for 30 days → Expires Dec 1, 2025 (Nov 1 + 30 days)
   *
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @param expiresAt - Optional expiration date (typically 30 days from now for new codes)
   * @returns The created or updated user subscription
   */
  async activate(
    userId: number,
    subscriptionId: number,
    expiresAt?: Date,
  ): Promise<UserSubscription> {
    // Check if subscription already exists
    const existing = await this.findOneBy(
      and(
        eq(this.table.userId, userId),
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
          newExpiresAt = expiresAt || existing.expiresAt;
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
          activatedAt: new Date(), // Update activation time
        })
        .where(
          and(
            eq(this.table.userId, userId),
            eq(this.table.subscriptionId, subscriptionId),
          ),
        )
        .returning();

      return updated[0];
    } else {
      // Subscription doesn't exist - create it
      return this.create({
        userId,
        subscriptionId,
        expiresAt,
        isActive: true,
      });
    }
  }

  /**
   * Deactivate a user's subscription (soft delete)
   * @param userId - The user's Telegram ID
   * @param subscriptionId - The subscription ID
   * @returns void
   */
  async deactivate(userId: number, subscriptionId: number): Promise<void> {
    await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(
        and(
          eq(this.table.userId, userId),
          eq(this.table.subscriptionId, subscriptionId),
        ),
      );
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
      user: User;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  > {
    const conditions = [
      eq(this.table.isActive, true),
      eq(users.isActive, true),
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
        user: users,
        subscription: subscriptions,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(users, eq(this.table.userId, users.telegramId))
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
      user: User;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  > {
    const now = new Date();
    const conditions = [
      eq(this.table.isActive, true),
      eq(users.isActive, true),
      eq(subscriptions.isActive, true),
      eq(this.table.subscriptionId, subscriptionId),
      sql`${this.table.expiresAt} IS NOT NULL`,
      sql`${this.table.expiresAt} >= ${now}`,
    ];

    const result = await this.db
      .select({
        user: users,
        subscription: subscriptions,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(users, eq(this.table.userId, users.telegramId))
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
      user: User;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  > {
    const now = new Date();
    const conditions = [
      eq(this.table.isActive, true),
      eq(users.isActive, true),
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
        subscription: subscriptions,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(users, eq(this.table.userId, users.telegramId))
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
      user: User;
      userSubscription: UserSubscription;
    }>
  > {
    const result = await this.db
      .select({
        user: users,
        userSubscription: this.table,
      })
      .from(this.table)
      .innerJoin(users, eq(this.table.userId, users.telegramId))
      .where(
        and(
          eq(this.table.subscriptionId, subscriptionId),
          eq(this.table.isActive, true),
          eq(users.isActive, true),
        ),
      );

    return result;
  }
}
