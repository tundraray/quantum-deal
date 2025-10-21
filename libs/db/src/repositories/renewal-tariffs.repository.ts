import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  renewalTariffs,
  RenewalTariff,
  NewRenewalTariff,
} from '../schema/renewal-tariffs';
import { subscriptions } from '../schema/subscriptions';
import { eq, and } from 'drizzle-orm';

export interface TariffWithSubscription extends RenewalTariff {
  subscription: {
    id: number;
    name: string;
  };
}

@Injectable()
export class RenewalTariffsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  /**
   * Find all active tariffs with subscription information
   * Returns tariffs joined with subscription data
   *
   * @returns Array of tariffs with subscription info
   */
  async findAllWithSubscriptions(): Promise<TariffWithSubscription[]> {
    const result = await this.db
      .select({
        id: renewalTariffs.id,
        subscriptionId: renewalTariffs.subscriptionId,
        periodDays: renewalTariffs.periodDays,
        priceStars: renewalTariffs.priceStars,
        displayName: renewalTariffs.displayName,
        discountPercent: renewalTariffs.discountPercent,
        isActive: renewalTariffs.isActive,
        sortOrder: renewalTariffs.sortOrder,
        createdAt: renewalTariffs.createdAt,
        updatedAt: renewalTariffs.updatedAt,
        subscription: {
          id: subscriptions.id,
          name: subscriptions.name,
        },
      })
      .from(renewalTariffs)
      .leftJoin(
        subscriptions,
        eq(renewalTariffs.subscriptionId, subscriptions.id),
      )
      .where(eq(renewalTariffs.isActive, true))
      .orderBy(renewalTariffs.sortOrder, renewalTariffs.periodDays);

    return result as TariffWithSubscription[];
  }

  /**
   * Find tariffs for a specific subscription
   * Returns all active tariffs for the given subscription
   *
   * @param subscriptionId - Subscription ID to find tariffs for
   * @returns Array of active tariffs ordered by sort_order, then period_days
   */
  async findBySubscription(subscriptionId: number): Promise<RenewalTariff[]> {
    return this.db
      .select()
      .from(renewalTariffs)
      .where(
        and(
          eq(renewalTariffs.isActive, true),
          eq(renewalTariffs.subscriptionId, subscriptionId),
        ),
      )
      .orderBy(renewalTariffs.sortOrder, renewalTariffs.periodDays);
  }

  /**
   * Find a specific tariff by ID
   *
   * @param id - Tariff ID
   * @returns Tariff or null if not found
   */
  async findById(id: number): Promise<RenewalTariff | null> {
    const result = await this.db
      .select()
      .from(renewalTariffs)
      .where(eq(renewalTariffs.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new renewal tariff
   * Admin/management function
   *
   * @param tariff - Tariff data to insert
   * @returns Created tariff
   */
  async create(tariff: NewRenewalTariff): Promise<RenewalTariff> {
    const result = await this.db
      .insert(renewalTariffs)
      .values({
        ...tariff,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Update an existing tariff
   * Admin/management function
   *
   * @param id - Tariff ID to update
   * @param data - Partial tariff data to update
   * @returns Updated tariff or null if not found
   */
  async update(
    id: number,
    data: Partial<Omit<RenewalTariff, 'id' | 'createdAt'>>,
  ): Promise<RenewalTariff | null> {
    const result = await this.db
      .update(renewalTariffs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(renewalTariffs.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Deactivate a tariff (soft delete)
   * Preserves tariff in database for audit trail
   * Admin/management function
   *
   * @param id - Tariff ID to deactivate
   * @returns Updated tariff or null if not found
   */
  async deactivate(id: number): Promise<RenewalTariff | null> {
    const result = await this.db
      .update(renewalTariffs)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(renewalTariffs.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Reactivate a previously deactivated tariff
   * Admin/management function
   *
   * @param id - Tariff ID to reactivate
   * @returns Updated tariff or null if not found
   */
  async reactivate(id: number): Promise<RenewalTariff | null> {
    const result = await this.db
      .update(renewalTariffs)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(renewalTariffs.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Find all tariffs (including inactive)
   * Admin/management function for listing all tariffs
   *
   * @returns Array of all tariffs
   */
  async findAll(): Promise<RenewalTariff[]> {
    return this.db
      .select()
      .from(renewalTariffs)
      .orderBy(
        renewalTariffs.subscriptionId,
        renewalTariffs.sortOrder,
        renewalTariffs.periodDays,
      );
  }
}
