import {
  pgTable,
  bigint,
  varchar,
  jsonb,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { bots } from './bots';

export interface BotUserPreferences {
  notifications?: {
    signals?: boolean;
    broadcasts?: boolean;
    reminders?: boolean;
  };
  display?: {
    showPips?: boolean;
    showPercentage?: boolean;
  };
}

export interface BotUserState {
  currentScene?: string;
  sceneData?: Record<string, unknown>;
  lastCommand?: string;
  lastCommandAt?: string;
}

export const botUsers = pgTable(
  'bot_users',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),
    botId: bigint('bot_id', { mode: 'number' })
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    lang: varchar('lang', { length: 10 }),
    preferences: jsonb('preferences').$type<BotUserPreferences>(),
    state: jsonb('state').$type<BotUserState>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('uq_bot_users_user_bot').on(table.userId, table.botId)],
);

export type BotUser = typeof botUsers.$inferSelect;
export type NewBotUser = typeof botUsers.$inferInsert;
