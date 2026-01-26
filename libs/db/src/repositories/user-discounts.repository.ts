import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  UserDiscount,
  NewUserDiscount,
  userDiscounts,
} from '../schema/user-discounts';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Repository for managing user permanent discounts
 *
 * Handles the user_discounts table which stores permanent discounts assigned
 * to users. Supports upsert behavior (one discount per user per subscription).
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 * ADR Reference: ADR-010-promocode-discount-system.md (Decision 1: user_discounts table)
 */
@Injectable()
export class UserDiscountsRepository extends BaseRepository<
  UserDiscount,
  NewUserDiscount,
  number
> {
  protected table = userDiscounts;
  protected idColumn = userDiscounts.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find a user's discount for a specific subscription
   * Returns the permanent discount if one exists
   *
   * @param botUserId - The bot user ID (bot_users.id)
   * @param subscriptionId - The subscription ID
   * @returns The user discount or null if not found
   */
  async findByBotUserAndSubscription(
    botUserId: number,
    subscriptionId: number,
  ): Promise<UserDiscount | null> {
    return this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );
  }

  /**
   * Check if a user has a discount for a specific subscription
   * More efficient than findByBotUserAndSubscription when only existence check is needed
   *
   * @param botUserId - The bot user ID (bot_users.id)
   * @param subscriptionId - The subscription ID
   * @returns true if the user has a discount for this subscription
   */
  async existsForUser(
    botUserId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.db
      .select({ exists: sql<boolean>`TRUE` })
      .from(this.table)
      .where(
        and(
          eq(this.table.botUserId, botUserId),
          eq(this.table.subscriptionId, subscriptionId),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Insert or update a user discount (upsert)
   * If the user already has a discount for the subscription, it will be replaced
   * This implements AC-009: new promocode replaces existing discount
   *
   * @param discount - The discount data to insert or update
   * @returns The created or updated user discount
   */
  async upsert(discount: NewUserDiscount): Promise<UserDiscount> {
    // Use PostgreSQL ON CONFLICT DO UPDATE for atomic upsert
    const result = await this.db
      .insert(this.table)
      .values(discount)
      .onConflictDoUpdate({
        target: [this.table.botUserId, this.table.subscriptionId],
        set: {
          discountType: discount.discountType,
          discountValue: discount.discountValue,
          sourceType: discount.sourceType,
          sourceId: discount.sourceId,
          createdAt: new Date(), // Update timestamp on replacement
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Find all discounts for a specific bot user
   * Useful for displaying all applicable discounts to a user
   *
   * @param botUserId - The bot user ID (bot_users.id)
   * @returns Array of user discounts
   */
  async findByBotUserId(botUserId: number): Promise<UserDiscount[]> {
    return this.findBy(eq(this.table.botUserId, botUserId));
  }

  /**
   * Find all discounts from a specific source
   * Useful for analytics and tracking discount distribution
   *
   * @param sourceType - The source type ('promocode' or 'system_rule')
   * @param sourceId - The source ID (promocode.id or system_discount_rule.id)
   * @returns Array of user discounts from this source
   */
  async findBySource(
    sourceType: string,
    sourceId: number,
  ): Promise<UserDiscount[]> {
    return this.findBy(
      and(
        eq(this.table.sourceType, sourceType),
        eq(this.table.sourceId, sourceId),
      ),
    );
  }

  /**
   * Count discounts by source
   * Useful for analytics (e.g., how many users have a discount from a promocode)
   *
   * @param sourceType - The source type ('promocode' or 'system_rule')
   * @param sourceId - The source ID
   * @returns The count of discounts from this source
   */
  async countBySource(sourceType: string, sourceId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(this.table)
      .where(
        and(
          eq(this.table.sourceType, sourceType),
          eq(this.table.sourceId, sourceId),
        ),
      );

    return result[0]?.count ?? 0;
  }
}
