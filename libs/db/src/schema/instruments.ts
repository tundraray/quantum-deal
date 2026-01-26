import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const instruments = pgTable('instruments', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  group: varchar('group', { length: 50 }).notNull(), // 'forex', 'commodities', 'crypto', 'stocks'
  subgroup: varchar('subgroup', { length: 50 }), // 'european', 'us' for stocks, 'majors', 'minors' for forex
  sector: varchar('sector', { length: 50 }).notNull(), // 'crypto', 'forex', 'stocks', 'commodities'
  isActive: boolean('is_active').notNull().default(true),
  displayName: varchar('display_name', { length: 100 }), // Russian name for UI
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Instrument = typeof instruments.$inferSelect;
export type NewInstrument = typeof instruments.$inferInsert;
