// libs/db/src/repositories/bot-users.repository.ts

import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  botUsers,
  BotUser,
  NewBotUser,
  BotUserPreferences,
  BotUserState,
} from '../schema/bot-users';
import { users, User } from '../schema/users';

/**
 * BotUsersRepository
 *
 * Repository for managing bot-user relationships.
 * Handles per-bot user settings, preferences, and conversation state.
 *
 * Per ADR-004 Decision 1: Global user profile + per-bot settings table.
 * Language resolution hierarchy: bot_users.lang > users.lang > system default
 */
@Injectable()
export class BotUsersRepository extends BaseRepository<
  BotUser,
  NewBotUser,
  number
> {
  protected table = botUsers;
  protected idColumn = botUsers.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find bot-user record by userId and botId
   */
  async findByUserAndBot(
    userId: number,
    botId: number,
  ): Promise<BotUser | null> {
    return this.findOneBy(
      and(eq(botUsers.userId, userId), eq(botUsers.botId, botId)),
    );
  }

  /**
   * Find or create bot-user record
   * Creates new record if user-bot combination doesn't exist
   */
  async findOrCreate(
    userId: number,
    botId: number,
    defaults?: Partial<NewBotUser>,
  ): Promise<BotUser> {
    const existing = await this.findByUserAndBot(userId, botId);
    if (existing) return existing;

    return this.create({
      userId,
      botId,
      lang: defaults?.lang,
      preferences: defaults?.preferences,
      state: defaults?.state,
      isActive: defaults?.isActive ?? true,
    });
  }

  /**
   * Find all bots a user is associated with
   */
  async findBotsByUserId(userId: number): Promise<BotUser[]> {
    return this.findBy(eq(botUsers.userId, userId));
  }

  /**
   * Find all users associated with a bot
   */
  async findUsersByBotId(botId: number): Promise<BotUser[]> {
    return this.findBy(eq(botUsers.botId, botId));
  }

  /**
   * Find all active users for a bot
   */
  async findActiveUsersByBotId(botId: number): Promise<BotUser[]> {
    return this.findBy(
      and(eq(botUsers.botId, botId), eq(botUsers.isActive, true)),
    );
  }

  /**
   * Find all active users for a bot with full user details (JOIN)
   *
   * Returns users where BOTH bot_users.isActive AND users.isActive are true.
   * Used for broadcast operations to active users.
   */
  async findActiveUsersWithDetailsByBotId(
    botId: number,
  ): Promise<Array<{ botUser: BotUser; user: User }>> {
    const result = await this.db
      .select({
        botUser: botUsers,
        user: users,
      })
      .from(botUsers)
      .innerJoin(users, eq(botUsers.userId, users.telegramId))
      .where(and(eq(botUsers.botId, botId), eq(botUsers.isActive, true)));

    return result;
  }

  /**
   * Update user language for a specific bot
   */
  async updateLanguage(
    userId: number,
    botId: number,
    lang: string,
  ): Promise<BotUser | null> {
    const result = await this.db
      .update(botUsers)
      .set({ lang, updatedAt: new Date() })
      .where(and(eq(botUsers.userId, userId), eq(botUsers.botId, botId)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Update user preferences for a specific bot
   */
  async updatePreferences(
    userId: number,
    botId: number,
    preferences: BotUserPreferences,
  ): Promise<BotUser | null> {
    const result = await this.db
      .update(botUsers)
      .set({ preferences, updatedAt: new Date() })
      .where(and(eq(botUsers.userId, userId), eq(botUsers.botId, botId)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Update conversation state for a specific bot
   */
  async updateState(
    userId: number,
    botId: number,
    state: BotUserState,
  ): Promise<BotUser | null> {
    const result = await this.db
      .update(botUsers)
      .set({ state, updatedAt: new Date() })
      .where(and(eq(botUsers.userId, userId), eq(botUsers.botId, botId)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Deactivate user for a specific bot (user blocked the bot)
   */
  async deactivate(telegramId: number, botId: number): Promise<BotUser | null> {
    const result = await this.db
      .update(botUsers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(botUsers.userId, telegramId), eq(botUsers.botId, botId)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Activate user for a specific bot (user unblocked the bot)
   */
  async activate(userId: number, botId: number): Promise<BotUser | null> {
    const result = await this.db
      .update(botUsers)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(botUsers.userId, userId), eq(botUsers.botId, botId)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Resolve user language for a bot following hierarchy:
   * 1. bot_users.lang (bot-specific preference)
   * 2. users.lang (global user preference)
   * 3. defaultLang parameter (system default)
   *
   * Per ADR-004 Decision 1: Language resolution hierarchy
   */
  async resolveLanguage(
    userId: number,
    botId: number,
    defaultLang = 'en',
  ): Promise<string> {
    const botUser = await this.findByUserAndBot(userId, botId);
    if (botUser?.lang) return botUser.lang;

    return defaultLang;
  }
}
