import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { users } from './users';
import { managers } from './managers';
import { bots } from './bots';

export const codes = pgTable(
  'codes',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    code: varchar('code').notNull(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id),
    botId: bigint('bot_id', { mode: 'number' }).references(() => bots.id, {
      onDelete: 'cascade',
    }),
    userId: bigint('user_id', { mode: 'number' }).references(
      () => users.telegramId,
    ),
    managerId: bigint('manager_id', { mode: 'number' }).references(
      () => managers.telegramId,
    ),
    activationDate: timestamp('activation_date'),
    expirationDate: timestamp('expiration_date'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('idx_codes_bot').on(table.botId)],
);

export type Code = typeof codes.$inferSelect;
export type NewCode = typeof codes.$inferInsert;
