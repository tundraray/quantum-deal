import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  PromocodeActivation,
  NewPromocodeActivation,
  promocodeActivations,
} from '../schema/promocode-activations';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Repository for tracking promocode activations
 *
 * Manages the promocode_activations table which records each time a user
 * activates a promocode. Supports idempotency checks and activation counting.
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 */
@Injectable()
export class PromocodeActivationsRepository extends BaseRepository<
  PromocodeActivation,
  NewPromocodeActivation,
  number
> {
  protected table = promocodeActivations;
  protected idColumn = promocodeActivations.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find an activation record by promocode and bot user
   * Used to check if a user has already activated a specific promocode
   *
   * @param promocodeId - The promocode ID
   * @param botUserId - The bot user ID (bot_users.id)
   * @returns The activation record or null if not found
   */
  async findByPromocodeAndUser(
    promocodeId: number,
    botUserId: number,
  ): Promise<PromocodeActivation | null> {
    return this.findOneBy(
      and(
        eq(this.table.promocodeId, promocodeId),
        eq(this.table.botUserId, botUserId),
      ),
    );
  }

  /**
   * Find all activations for a specific promocode
   * Useful for auditing and analytics
   *
   * @param promocodeId - The promocode ID
   * @returns Array of activation records
   */
  async findByPromocodeId(promocodeId: number): Promise<PromocodeActivation[]> {
    return this.findBy(eq(this.table.promocodeId, promocodeId));
  }

  /**
   * Count total activations for a promocode
   * Used to check if a single-use promocode has been exhausted
   *
   * @param promocodeId - The promocode ID
   * @returns The number of activations
   */
  async countByPromocodeId(promocodeId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(this.table)
      .where(eq(this.table.promocodeId, promocodeId));

    return result[0]?.count ?? 0;
  }

  /**
   * Check if a user has already activated a specific promocode
   * More efficient than findByPromocodeAndUser when only existence check is needed
   *
   * @param promocodeId - The promocode ID
   * @param botUserId - The bot user ID (bot_users.id)
   * @returns true if the user has activated the promocode
   */
  async hasUserActivated(
    promocodeId: number,
    botUserId: number,
  ): Promise<boolean> {
    const result = await this.db
      .select({ exists: sql<boolean>`TRUE` })
      .from(this.table)
      .where(
        and(
          eq(this.table.promocodeId, promocodeId),
          eq(this.table.botUserId, botUserId),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find all activations by a specific bot user
   * Useful for user history and analytics
   *
   * @param botUserId - The bot user ID (bot_users.id)
   * @returns Array of activation records
   */
  async findByBotUserId(botUserId: number): Promise<PromocodeActivation[]> {
    return this.findBy(eq(this.table.botUserId, botUserId));
  }
}
