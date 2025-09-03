import { Injectable, Inject } from '@nestjs/common';
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
}
