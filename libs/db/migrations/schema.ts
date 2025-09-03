/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-loss-of-precision */
import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  boolean,
  real,
  integer,
  text,
  foreignKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const managers = pgTable('managers', {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  username: varchar().default('100'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey().notNull(),
  lang: varchar().default('10'),
  firstName: varchar('first_name').default('255'),
  lastName: varchar('last_name').default('255'),
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').notNull(),
});

export const orders = pgTable('orders', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
    name: 'orders_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
    cache: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  symbol: varchar().default('20').notNull(),
  orderType: varchar('order_type').default('20').notNull(),
  lots: real().notNull(),
  openPrice: real('open_price').notNull(),
  closePrice: real('close_price'),
  stopLoss: real('stop_loss'),
  takeProfit: real('take_profit'),
  profit: real(),
  ticketId: integer('ticket_id').notNull(),
  closeTime: timestamp('close_time', { mode: 'string' }),
});

export const messages = pgTable('messages', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
    name: 'messages_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
    cache: 1,
  }),
  lang: varchar().default('10'),
  message: text(),
  type: varchar().default('10'),
});

export const codes = pgTable(
  'codes',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
      name: 'codes_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    code: varchar().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    subscriptionId: bigint('subscription_id', { mode: 'number' }).notNull(),
    activationDate: timestamp('activation_date', { mode: 'string' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }),
    expirationDate: timestamp('expiration_date', { mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.id],
      name: 'codes_subscription_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.telegramId],
      name: 'codes_user_id_fkey',
    }),
  ],
);

export const subscriptions = pgTable('subscriptions', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
    name: 'subscriptions_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
    cache: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  name: varchar().notNull(),
  scope: jsonb(),
});

export const users = pgTable(
  'users',
  {
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    username: varchar().default('100'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    telegramId: bigint('telegram_id', { mode: 'number' })
      .primaryKey()
      .notNull(),
    lang: varchar().default('10'),
    firstName: varchar('first_name').default('255'),
    lastName: varchar('last_name').default('255'),
    isPremium: boolean('is_premium').default(false),
    subscribeExpirationDate: timestamp('subscribe_expiration_date', {
      withTimezone: true,
      mode: 'string',
    }),
    subscribeId: integer('subscribe_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.subscribeId],
      foreignColumns: [subscriptions.id],
      name: 'users_subscribe_id_fkey',
    }),
  ],
);

export const summary = pgTable('summary', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
    name: 'summary_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
    cache: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  result: real().notNull(),
});
