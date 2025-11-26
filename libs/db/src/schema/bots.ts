import {
  pgTable,
  bigint,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const bots = pgTable('bots', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  token: varchar('token', { length: 100 }).notNull(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  webhookPath: varchar('webhook_path', { length: 100 }),
  isDynamic: boolean('is_dynamic').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
