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

  public deactivateUser(telegramId: number) {
    return this.update(telegramId, { isActive: false });
  }

  public activateUser(telegramId: number) {
    return this.update(telegramId, { isActive: true });
  }

  public findActiveUsers() {
    return this.findBy(eq(this.table.isActive, true));
  }

  /**
   * Creates a new user or updates existing one on conflict
   * Updates profile fields (username, firstName, lastName, lang, isPremium) and activates user
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
          lang: data.lang,
          isPremium: data.isPremium,
          isActive: true,
        },
      })
      .returning();

    return result[0];
  }
}
