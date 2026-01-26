import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  SystemDiscountRule,
  NewSystemDiscountRule,
  systemDiscountRules,
} from '../schema/system-discount-rules';
import { eq, and, or, isNull } from 'drizzle-orm';

/**
 * Repository for managing system discount rules
 *
 * Handles the system_discount_rules table which defines automatic discount
 * rules that are processed by the scheduler. Supports global and bot-specific rules.
 *
 * Design Doc Reference: docs/design/promocodes-design.md
 */
@Injectable()
export class SystemDiscountRulesRepository extends BaseRepository<
  SystemDiscountRule,
  NewSystemDiscountRule,
  number
> {
  protected table = systemDiscountRules;
  protected idColumn = systemDiscountRules.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find all active system discount rules
   * Used by the scheduler to process automatic discounts
   *
   * @returns Array of active system discount rules
   */
  async findActiveRules(): Promise<SystemDiscountRule[]> {
    return this.findBy(eq(this.table.isActive, true));
  }

  /**
   * Find rules applicable to a specific subscription and bot
   * Returns both global rules (botId=NULL) and bot-specific rules
   * Bot-specific rules take precedence (handled by caller)
   *
   * @param subscriptionId - The subscription ID
   * @param botId - The bot ID (null to get only global rules)
   * @returns Array of applicable rules
   */
  async findBySubscriptionAndBot(
    subscriptionId: number,
    botId: number | null,
  ): Promise<SystemDiscountRule[]> {
    // Include global rules (botId=NULL) and optionally bot-specific rules
    if (botId !== null) {
      return this.findBy(
        and(
          eq(this.table.subscriptionId, subscriptionId),
          eq(this.table.isActive, true),
          or(isNull(this.table.botId), eq(this.table.botId, botId)),
        ),
      );
    }

    return this.findBy(
      and(
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
        isNull(this.table.botId),
      ),
    );
  }

  /**
   * Find active rules for a specific subscription
   * Includes both global and bot-specific rules
   *
   * @param subscriptionId - The subscription ID
   * @returns Array of active rules for the subscription
   */
  async findActiveBySubscriptionId(
    subscriptionId: number,
  ): Promise<SystemDiscountRule[]> {
    return this.findBy(
      and(
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
      ),
    );
  }

  /**
   * Find active rules for a specific bot
   * Includes both global rules and bot-specific rules
   *
   * @param botId - The bot ID
   * @returns Array of active rules applicable to the bot
   */
  async findActiveByBotId(botId: number): Promise<SystemDiscountRule[]> {
    return this.findBy(
      and(
        eq(this.table.isActive, true),
        or(isNull(this.table.botId), eq(this.table.botId, botId)),
      ),
    );
  }

  /**
   * Deactivate a rule by setting isActive=false
   *
   * @param id - The rule ID to deactivate
   * @returns The deactivated rule or null if not found
   */
  async deactivate(id: number): Promise<SystemDiscountRule | null> {
    const result = await this.db
      .update(this.table)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(this.idColumn, id))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Find rules created by a specific manager
   * Useful for auditing and management
   *
   * @param managerId - The manager's Telegram ID (created_by)
   * @returns Array of rules created by the manager
   */
  async findByManagerId(managerId: number): Promise<SystemDiscountRule[]> {
    return this.findBy(eq(this.table.createdBy, managerId));
  }
}
