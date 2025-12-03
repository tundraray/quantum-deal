import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { users, User, NewUser } from '../schema/users';
import { eq } from 'drizzle-orm';

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

  /**
   * Creates a new user or updates existing one on conflict
   * Updates profile fields (username, firstName, lastName, isPremium)
   */
  public async upsert(data: NewUser): Promise<User> {
    const result = await this.db
      .insert(this.table)
      .values(data)
      .onConflictDoUpdate({
        target: this.table.telegramId,
        set: {
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          isPremium: data.isPremium,
        },
      })
      .returning();

    return result[0];
  }
}
