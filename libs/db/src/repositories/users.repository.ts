import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { users, User, NewUser } from '../schema/users';
import { and, eq, gte, sql } from 'drizzle-orm';

@Injectable()
export class UsersRepository extends BaseRepository<User, NewUser, number> {
  protected table = users;
  protected idColumn = users.telegramId;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  public async findByTelegramId(telegramId: number) {
    return this.findOneBy(eq(this.table.telegramId, telegramId));
  }

  public deactivateUser(telegramId: number) {
    return this.update(telegramId, { isActive: false });
  }

  public activateUser(telegramId: number) {
    return this.update(telegramId, { isActive: true });
  }

  public findActiveUsers() {
    return this.findBy(eq(this.table.isActive, true));
  }

  public findBySubscription(subscriptionId: number) {
    return this.findBy(
      and(
        eq(this.table.isActive, true),
        eq(this.table.subscribeId, subscriptionId),
      ),
    );
  }

  public async findActiveUsersWithActiveSubscription() {
    const now = new Date();
    return await this.findBy(
      and(
        eq(this.table.isActive, true),
        sql`${users.subscribeId} IS NOT NULL`,
        sql`${users.subscribeExpirationDate} IS NOT NULL`,
        gte(users.subscribeExpirationDate, now),
      ),
    );
  }

  /**
   * Find active users whose subscription expires in exactly N days from now
   * Used for sending expiration notifications at specific thresholds
   *
   * @param daysFromNow - Number of days from now (0 = today, 3 = 3 days from now, etc.)
   * @returns Array of users with subscriptions expiring on the target date
   */
  public async findUsersWithExpiringSubscriptions(
    daysFromNow: number,
  ): Promise<User[]> {
    // Compare by date only (ignore time-of-day)
    // Matches rows where DATE(subscribe_expiration_date) = CURRENT_DATE + daysFromNow
    return await this.findBy(
      and(
        eq(this.table.isActive, true),
        sql`${users.subscribeId} IS NOT NULL`,
        sql`${users.subscribeExpirationDate} IS NOT NULL`,
        sql`${users.subscribeExpirationDate}::date = CURRENT_DATE + ${daysFromNow}::int`,
      ),
    );
  }
}
