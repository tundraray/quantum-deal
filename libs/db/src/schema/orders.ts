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
    ticketId: varchar('ticket_id', { length: 50 }).notNull(), // Changed to varchar to handle longer ticket IDs
    symbol: varchar('symbol', { length: 20 }).notNull(),
    orderType: varchar('order_type', { length: 20 }).notNull(),

    // Volume and pricing
    lots: real('lots').notNull(), // Maps to volume/order_volume
    openPrice: real('open_price').notNull(), // Maps to price/order_price
    closePrice: real('close_price'), // Maps to deal_price
    stopLoss: real('stop_loss'), // Maps to sl/order_sl
    takeProfit: real('take_profit'), // Maps to tp/order_tp
    profit: real('profit'), // Maps to total_profit
    closeTime: timestamp('close_time'), // For closed positions

    // MT5 Event specific fields
    eventType: varchar('event_type', { length: 30 }).notNull(), // OPEN, CLOSE, PENDING, etc.
    account: varchar('account', { length: 50 }).notNull(),
    broker: varchar('broker', { length: 100 }).notNull(),
    schemaVersion: varchar('schema_version', { length: 10 }).notNull(),
    eaVersion: varchar('ea_version', { length: 20 }).notNull(),
    sector: varchar('sector', { length: 50 }),
    positionId: varchar('position_id', { length: 50 }),
    eventTimestamp: timestamp('event_timestamp', {
      withTimezone: true,
    }).notNull(),

    // Additional financial fields
    swap: real('swap'),
    commission: real('commission'),
    dealType: varchar('deal_type', { length: 10 }),
    dealVolume: real('deal_volume'),
    dealProfit: real('deal_profit'),
    dealSwap: real('deal_swap'),
    partialClose: real('partial_close'),
    comment: text('comment'),

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
    eventTypeIdx: index('orders_event_type_idx').on(table.eventType),
    eventTimestampIdx: index('orders_event_timestamp_idx').on(
      table.eventTimestamp,
    ),
    positionIdIdx: index('orders_position_id_idx').on(table.positionId),
    accountEventTimestampIdx: index('orders_account_event_timestamp_idx').on(
      table.account,
      table.eventTimestamp,
    ),
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
