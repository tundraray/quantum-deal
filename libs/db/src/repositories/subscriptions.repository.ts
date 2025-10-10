import { Injectable, Inject } from '@nestjs/common';
import { sql, or, eq, and, like } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  subscriptions,
  Subscription,
  NewSubscription,
  isBroadcastSubscription,
} from '../schema/subscriptions';

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
   * Find subscriptions that match a specific sector
   * Supports wildcard '*' for all sectors
   */
  async findBySector(sector: string): Promise<Subscription[]> {
    return this.db
      .select()
      .from(subscriptions)
      .where(
        or(
          // Check if scope contains the specific sector
          sql`${subscriptions.scope} ? ${sector}`,
          // Check if scope contains wildcard '*' (all sectors)
          sql`${subscriptions.scope} ? '*'`,
        ),
      );
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
        like(this.table.type, 'subscription_%'),
        eq(this.table.isActive, true),
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
    return this.findBy(eq(this.table.isActive, true));
  }
}
