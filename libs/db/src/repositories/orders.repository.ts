import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { orders, Order, NewOrder } from '../schema/orders';

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
  async findByTicket(ticketId: string): Promise<Order[]> {
    return this.findBy(eq(orders.ticketId, ticketId));
  }

  /**
   * Find orders by position ID
   */
  async findByPositionId(positionId: string): Promise<Order[]> {
    return this.findBy(eq(orders.positionId, positionId));
  }
}
