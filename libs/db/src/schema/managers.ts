import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  boolean,
} from 'drizzle-orm/pg-core';

export const managers = pgTable('managers', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey().notNull(),
  username: varchar('username', { length: 100 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  lang: varchar('lang', { length: 10 }),
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Manager = typeof managers.$inferSelect;
export type NewManager = typeof managers.$inferInsert;
