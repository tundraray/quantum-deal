import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  real,
  integer,
} from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  ticketId: integer('ticket_id').notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  orderType: varchar('order_type', { length: 20 }).notNull(),
  lots: real('lots').notNull(),
  openPrice: real('open_price').notNull(),
  closePrice: real('close_price'),
  stopLoss: real('stop_loss'),
  takeProfit: real('take_profit'),
  profit: real('profit'),
  closeTime: timestamp('close_time'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
