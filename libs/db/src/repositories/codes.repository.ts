import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { Code, codes, NewCode } from '../schema/codes';
import { eq, and, isNull } from 'drizzle-orm';

@Injectable()
export class CodesRepository extends BaseRepository<Code, NewCode, number> {
  protected table = codes;
  protected idColumn = codes.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find an available (unactivated) code by code string
   * @param code - The code string to search for
   * @returns The code object or null if not found or already activated
   */
  public async findByCode(code: string) {
    const condition = and(eq(this.table.code, code), isNull(this.table.userId));

    return this.findOneBy(condition);
  }

  /**
   * Find all codes for a specific subscription
   * @param subscriptionId - The subscription ID
   * @returns Array of all codes for the subscription
   */
  async findBySubscription(subscriptionId: number): Promise<Code[]> {
    return this.findBy(eq(this.table.subscriptionId, subscriptionId));
  }

  /**
   * Find all active codes for a specific subscription
   * @param subscriptionId - The subscription ID
   * @returns Array of active codes for the subscription
   */
  async findActiveCodesBySubscription(subscriptionId: number): Promise<Code[]> {
    return this.findBy(
      and(
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
      ),
    );
  }

  /**
   * Find all unused (not activated) active codes for a specific subscription
   * @param subscriptionId - The subscription ID
   * @returns Array of unused active codes
   */
  async findUnusedActiveCodesBySubscription(
    subscriptionId: number,
  ): Promise<Code[]> {
    return this.findBy(
      and(
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
        isNull(this.table.userId),
      ),
    );
  }

  /**
   * Find all activated codes for a specific subscription
   * @param subscriptionId - The subscription ID
   * @returns Array of activated codes
   */
  async findActivatedCodesBySubscription(
    subscriptionId: number,
  ): Promise<Code[]> {
    return this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.subscriptionId, subscriptionId),
          eq(this.table.isActive, true),
          // userId is NOT NULL means the code has been activated
          // Using raw SQL since drizzle doesn't have a direct isNotNull helper
          // that works well in all contexts
        ),
      )
      .then((codes) => codes.filter((code) => code.userId !== null));
  }

  /**
   * Deactivate all codes for a specific subscription
   * Used when a subscription is closed to invalidate all associated codes
   *
   * @param subscriptionId - The subscription ID
   * @returns void
   */
  async deactivateCodesBySubscription(subscriptionId: number): Promise<void> {
    await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(eq(this.table.subscriptionId, subscriptionId));
  }

  /**
   * Deactivate a specific code by ID
   * @param id - The code ID
   * @returns The updated code or null
   */
  async deactivateCode(id: number): Promise<Code | null> {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate a code (mark as used by a user)
   * @param codeId - The code ID
   * @param userId - The user's Telegram ID
   * @param activationDate - Optional activation date (defaults to now)
   * @param expirationDate - Optional expiration date
   * @returns The updated code or null
   */
  async activateCode(
    codeId: number,
    userId: number,
    activationDate?: Date,
    expirationDate?: Date,
  ): Promise<Code | null> {
    return this.update(codeId, {
      userId,
      activationDate: activationDate || new Date(),
      expirationDate,
    });
  }
}
