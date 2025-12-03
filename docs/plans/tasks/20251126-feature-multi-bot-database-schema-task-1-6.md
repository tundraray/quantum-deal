# Task: Modify renewal-tariffs.ts - Add botId Column

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: Task 1.1 (bots.ts)
- Provides: Modified libs/db/src/schema/renewal-tariffs.ts
- Size: Small (1 file modification)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Add botId column to renewal_tariffs table to support bot-specific pricing. The column is nullable to allow global tariffs (apply to all bots). Update the unique constraint to include botId.

## Target Files
- [x] `libs/db/src/schema/renewal-tariffs.ts` (modify existing)

## Implementation Steps

### 1. Read Existing File
- [x] Read current renewal-tariffs.ts to understand existing structure
- [x] Identify import section, columns, constraints, and existing unique constraint

### 2. Add Import
- [x] Add import for bots: `import { bots } from './bots'`

### 3. Add botId Column
- [x] Add botId column after subscriptionId:
  ```typescript
  botId: bigint('bot_id', { mode: 'number' })
    .references(() => bots.id, { onDelete: 'cascade' }),
  ```
- [x] Column is nullable for global tariffs

### 4. Update Unique Constraint
- [x] Find existing unique constraint on (subscriptionId, periodDays)
- [x] Update to include botId: (subscriptionId, periodDays, botId)
  ```typescript
  unique('uq_renewal_tariff_subscription_period_bot').on(
    table.subscriptionId,
    table.periodDays,
    table.botId,
  ),
  ```

### 5. Add Index
- [x] Add index on botId: `index('idx_renewal_tariffs_bot').on(table.botId)`

### 6. Verify Type Export
- [x] Ensure RenewalTariff type now includes botId (optional)
- [x] Ensure NewRenewalTariff type includes botId (optional)

### 7. Verify Compilation
- [x] Run `pnpm typecheck` to verify TypeScript compiles
- [x] No type errors

## Reference Implementation

From Design Doc Section 2.2:
```typescript
import {
  pgTable,
  bigint,
  integer,
  varchar,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { subscriptions } from './subscriptions'
import { bots } from './bots'

export const renewalTariffs = pgTable(
  'renewal_tariffs',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    botId: bigint('bot_id', { mode: 'number' })
      .references(() => bots.id, { onDelete: 'cascade' }),
    periodDays: integer('period_days').notNull(),
    priceStars: integer('price_stars').notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    discountPercent: integer('discount_percent'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('uq_renewal_tariff_subscription_period_bot').on(
      table.subscriptionId,
      table.periodDays,
      table.botId,
    ),
    index('idx_renewal_tariffs_bot').on(table.botId),
  ],
)

export type RenewalTariff = typeof renewalTariffs.$inferSelect
export type NewRenewalTariff = typeof renewalTariffs.$inferInsert
```

## Completion Criteria
- [x] bots import added to renewal-tariffs.ts
- [x] botId column added with FK to bots.id
- [x] botId is nullable (for global tariffs)
- [x] Unique constraint updated to (subscriptionId, periodDays, botId)
- [x] Index created for bot-specific tariff lookup
- [x] RenewalTariff type includes botId
- [x] TypeScript compilation succeeds

## Notes
- Impact scope: RenewalTariffsRepository may need updates
- Constraints: NULL botId means global tariff (applies to all bots without specific tariff)
- Pattern: Tariff resolution priority: bot-specific (botId set) > global (botId null)
