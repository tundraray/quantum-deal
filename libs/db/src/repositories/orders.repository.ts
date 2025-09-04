import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
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

  /**
   * Check if an event already exists (to prevent duplicates)
   * @deprecated Use findOneByTicket instead for update scenarios
   */
  async eventExists(ticketId: number): Promise<boolean> {
    const condition = and(eq(orders.ticketId, ticketId));

    const result = await this.findOneBy(condition!);
    return result !== null;
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
