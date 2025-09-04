import { Injectable, Inject } from '@nestjs/common';
import { sql, or } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  subscriptions,
  Subscription,
  NewSubscription,
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
}
