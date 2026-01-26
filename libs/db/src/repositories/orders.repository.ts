import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, isNotNull, inArray } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { orders, Order, NewOrder, MergedOrder } from '../schema/orders';

@Injectable()
export class OrdersRepository extends BaseRepository<Order, NewOrder, number> {
  protected table = orders;
  protected idColumn = orders.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find orders by ticket ID
   */
  async findByTicket(ticketId: number): Promise<Order[]> {
    return this.findBy(eq(orders.ticketId, ticketId));
  }

  /**
   * Find single order by ticket ID (for updates)
   */
  async findOneByTicket(ticketId: number): Promise<Order | null> {
    return this.findOneBy(eq(orders.ticketId, ticketId));
  }

  /**
   * Find orders by position ID
   */
  async findByPositionId(positionId: number): Promise<Order[]> {
    return this.findBy(eq(orders.positionId, positionId));
  }

  findAllByPeriod(startDate: Date, endDate: Date): Promise<Order[]> {
    return this.findBy(
      and(
        gte(orders.closeTime, startDate),
        lte(orders.closeTime, endDate),
        isNotNull(orders.closeTime),
      ),
    );
  }

  /**
   * Find orders by event timestamp period with optional sector filtering
   */
  async findByEventPeriod(
    startDate: Date,
    endDate: Date,
    allowedSectors?: string[],
  ): Promise<Order[]> {
    if (Array.isArray(allowedSectors) && allowedSectors.length === 0) {
      return [];
    }

    const baseCondition = and(
      gte(orders.eventTimestamp, startDate),
      lte(orders.eventTimestamp, endDate),
      isNotNull(orders.closeTime),
    );

    const condition =
      Array.isArray(allowedSectors) && allowedSectors.length > 0
        ? and(baseCondition, inArray(orders.sector, allowedSectors))
        : baseCondition;

    return this.findBy(condition);
  }

  /**
   * Update order by ticket ID
   */
  async updateByTicketId(
    ticketId: number,
    updates: Partial<MergedOrder>,
  ): Promise<MergedOrder | null> {
    const updatedOrders = await this.db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.ticketId, ticketId))
      .returning();

    return updatedOrders.length > 0
      ? ({
          ...updatedOrders[0],
          oldStopLoss: updates.oldStopLoss,
          oldTakeProfit: updates.oldTakeProfit,
        } as MergedOrder)
      : null;
  }
}
