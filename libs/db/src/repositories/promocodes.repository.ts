import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { Promocode, NewPromocode, promocodes } from '../schema/promocodes';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import type { PromocodeType } from '../schema/enums';

/**
 * Filters for querying promocodes
 */
export interface PromocodeFilters {
  type?: PromocodeType;
  isActive?: boolean;
  botId?: number | null;
}

/**
 * Repository for managing promocodes
 *
 * Provides CRUD operations and specialized queries for the promocodes table.
 * Supports manager isolation (created_by filtering) and multi-bot scoping.
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 */
@Injectable()
export class PromocodesRepository extends BaseRepository<
  Promocode,
  NewPromocode,
  number
> {
  protected table = promocodes;
  protected idColumn = promocodes.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find a promocode by its code string (case-insensitive)
   * Returns the promocode regardless of active status or bot scope
   *
   * @param code - The promocode string to search for
   * @returns The promocode or null if not found
   */
  async findByCode(code: string): Promise<Promocode | null> {
    const normalizedCode = code.toUpperCase().trim();
    return this.findOneBy(sql`UPPER(${this.table.code}) = ${normalizedCode}`);
  }

  /**
   * Find a promocode by code and bot scope
   * Matches either global promocodes (botId=NULL) or bot-specific promocodes
   *
   * @param code - The promocode string to search for
   * @param botId - The bot ID to match (null for global-only search)
   * @returns The promocode or null if not found or not valid for the bot
   */
  async findByCodeAndBot(
    code: string,
    botId: number | null,
  ): Promise<Promocode | null> {
    const normalizedCode = code.toUpperCase().trim();

    // Find promocode matching code AND (global OR matching bot)
    const condition = and(
      sql`UPPER(${this.table.code}) = ${normalizedCode}`,
      or(
        isNull(this.table.botId), // Global promocode
        botId !== null ? eq(this.table.botId, botId) : sql`FALSE`, // Bot-specific match
      ),
    );

    return this.findOneBy(condition);
  }

  /**
   * Find all active promocodes created by a specific manager
   *
   * @param managerId - The manager's Telegram ID (created_by)
   * @returns Array of active promocodes for the manager
   */
  async findActiveByManagerId(managerId: number): Promise<Promocode[]> {
    return this.findBy(
      and(eq(this.table.createdBy, managerId), eq(this.table.isActive, true)),
    );
  }

  /**
   * Find all promocodes created by a specific manager with optional filters
   * Supports filtering by type, active status, and bot scope
   *
   * @param managerId - The manager's Telegram ID (created_by)
   * @param filters - Optional filters to apply
   * @returns Array of promocodes matching the criteria
   */
  async findByManagerId(
    managerId: number,
    filters?: PromocodeFilters,
  ): Promise<Promocode[]> {
    const conditions = [eq(this.table.createdBy, managerId)];

    if (filters?.type !== undefined) {
      conditions.push(eq(this.table.type, filters.type));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(this.table.isActive, filters.isActive));
    }

    if (filters?.botId !== undefined) {
      if (filters.botId === null) {
        conditions.push(isNull(this.table.botId));
      } else {
        conditions.push(eq(this.table.botId, filters.botId));
      }
    }

    return this.findBy(and(...conditions));
  }

  /**
   * Deactivate a promocode by setting isActive=false and recording deactivatedAt
   *
   * @param id - The promocode ID to deactivate
   * @returns The deactivated promocode or null if not found
   */
  async deactivate(id: number): Promise<Promocode | null> {
    const result = await this.db
      .update(this.table)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(this.idColumn, id))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Increment the activation count tracking
   * Note: Actual activation count is calculated from promocode_activations table
   * This method updates the updatedAt timestamp for tracking purposes
   *
   * @param id - The promocode ID
   */
  async incrementActivationCount(id: number): Promise<void> {
    await this.db
      .update(this.table)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(this.idColumn, id));
  }

  /**
   * Find promocode by code with validation for activation
   * Returns the promocode only if it's active and within validity period
   *
   * @param code - The promocode string
   * @param botId - The bot ID for scope validation
   * @returns The valid promocode or null
   */
  async findValidByCode(
    code: string,
    botId: number | null,
  ): Promise<Promocode | null> {
    const normalizedCode = code.toUpperCase().trim();
    const now = new Date();

    const conditions = [
      sql`UPPER(${this.table.code}) = ${normalizedCode}`,
      eq(this.table.isActive, true),
      or(
        isNull(this.table.botId),
        botId !== null ? eq(this.table.botId, botId) : sql`FALSE`,
      ),
      or(isNull(this.table.validFrom), sql`${this.table.validFrom} <= ${now}`),
      or(
        isNull(this.table.validUntil),
        sql`${this.table.validUntil} >= ${now}`,
      ),
    ];

    return this.findOneBy(and(...conditions));
  }
}
