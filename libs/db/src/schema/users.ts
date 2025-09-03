import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';

export const users = pgTable('users', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey().notNull(),
  username: varchar('username', { length: 100 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  lang: varchar('lang', { length: 10 }),
  isPremium: boolean('is_premium').default(false),
  subscribeId: integer('subscribe_id').references(() => subscriptions.id),
  subscribeExpirationDate: timestamp('subscribe_expiration_date', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
