import { pgTable, bigint, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { promocodes } from './promocodes';
import { botUsers } from './bot-users';

export const promocodeActivations = pgTable(
  'promocode_activations',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    /**
     * Promocode that was activated
     */
    promocodeId: bigint('promocode_id', { mode: 'number' })
      .notNull()
      .references(() => promocodes.id, { onDelete: 'cascade' }),

    /**
     * Bot user who activated the promocode
     */
    botUserId: bigint('bot_user_id', { mode: 'number' })
      .notNull()
      .references(() => botUsers.id, { onDelete: 'cascade' }),

    /**
     * When the activation occurred
     */
    activatedAt: timestamp('activated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    /**
     * Prevent duplicate activations for same user/promocode
     */
    unique('uq_promocode_activations_promocode_user').on(
      table.promocodeId,
      table.botUserId,
    ),

    /**
     * Index for checking user's activations
     */
    index('idx_promocode_activations_bot_user').on(table.botUserId),

    /**
     * Index for counting promocode activations
     */
    index('idx_promocode_activations_promocode').on(table.promocodeId),
  ],
);

export type PromocodeActivation = typeof promocodeActivations.$inferSelect;
export type NewPromocodeActivation = typeof promocodeActivations.$inferInsert;
