import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  real,
  text,
  index,
} from 'drizzle-orm/pg-core';

export const orders = pgTable(
  'orders',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),

    // Core order identification
    ticketId: bigint('ticket_id', { mode: 'number' }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    orderType: varchar('order_type', { length: 20 }).notNull(),

    // Volume and pricing - MT5 fields
    lots: real('lots').notNull(), // Maps to volume
    openPrice: real('open_price').notNull(), // Maps to price (for OPEN events)
    closePrice: real('close_price'), // Maps to price (for CLOSE events)
    stopLoss: real('stop_loss'), // Maps to sl
    takeProfit: real('take_profit'), // Maps to tp
    profit: real('profit'), // Maps to profit/total_profit

    // System fields
    account: varchar('account', { length: 50 }).notNull(),
    broker: varchar('broker', { length: 100 }).notNull(),
    schemaVersion: varchar('schema_version', { length: 10 }).notNull(),
    eaVersion: varchar('ea_version', { length: 20 }).notNull(),
    eventTimestamp: timestamp('event_timestamp', {
      withTimezone: true,
    }).notNull(),

    // Additional MT5 financial fields
    swap: real('swap'), // Maps to swap
    commission: real('commission'), // Maps to commission (CLOSE events)
    comment: text('comment'), // Maps to comment

    // MT5 API fields - always present
    closeTime: timestamp('close_time', { withTimezone: true }), // Set when order is closed
    sector: varchar('sector', { length: 50 }), // Always present in MT5 API
    positionId: bigint('position_id', { mode: 'number' }), // Always present in MT5 API

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Indexes for better performance
    ticketIdIdx: index('orders_ticket_id_idx').on(table.ticketId),
    accountIdx: index('orders_account_idx').on(table.account),
    symbolIdx: index('orders_symbol_idx').on(table.symbol),
    eventTimestampIdx: index('orders_event_timestamp_idx').on(
      table.eventTimestamp,
    ),
    accountEventTimestampIdx: index('orders_account_event_timestamp_idx').on(
      table.account,
      table.eventTimestamp,
    ),
    positionIdIdx: index('orders_position_id_idx').on(table.positionId),
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
