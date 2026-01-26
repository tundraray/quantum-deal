# Task: Modify codes.ts - Add botId Column

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: Task 1.1 (bots.ts)
- Provides: Modified libs/db/src/schema/codes.ts
- Size: Small (1 file modification)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Add botId column to codes table to scope activation codes to specific bots. The column is nullable for backward compatibility during migration.

## Target Files
- [x] `libs/db/src/schema/codes.ts` (modify existing)

## Implementation Steps

### 1. Read Existing File
- [x] Read current codes.ts to understand existing structure
- [x] Identify import section, columns, and existing constraints

### 2. Add Import
- [x] Add import for bots: `import { bots } from './bots'`

### 3. Add botId Column
- [x] Add botId column after subscriptionId:
  ```typescript
  botId: bigint('bot_id', { mode: 'number' })
    .references(() => bots.id, { onDelete: 'cascade' }),
  ```
- [x] Column is nullable for backward compatibility

### 4. Add Index
- [x] Add index on botId: `index('idx_codes_bot').on(table.botId)`

### 5. Verify Type Export
- [x] Ensure Code type now includes botId (optional)
- [x] Ensure NewCode type includes botId (optional)

### 6. Verify Compilation
- [x] Run `pnpm typecheck` to verify TypeScript compiles
- [x] No type errors

## Reference Implementation

From Design Doc Section 2.3:
```typescript
import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  boolean,
  index,
} from 'drizzle-orm/pg-core'
import { subscriptions } from './subscriptions'
import { users } from './users'
import { managers } from './managers'
import { bots } from './bots'

export const codes = pgTable(
  'codes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    code: varchar('code').notNull(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id),
    botId: bigint('bot_id', { mode: 'number' })
      .references(() => bots.id, { onDelete: 'cascade' }),
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
  (table) => [
    index('idx_codes_bot').on(table.botId),
  ]
)

export type Code = typeof codes.$inferSelect
export type NewCode = typeof codes.$inferInsert
```

## Completion Criteria
- [x] bots import added to codes.ts
- [x] botId column added with FK to bots.id
- [x] botId is nullable for backward compatibility
- [x] CASCADE delete configured on botId FK
- [x] Index created for bot-scoped code lookup
- [x] Code type includes botId
- [x] TypeScript compilation succeeds

## Notes
- Impact scope: CodesRepository may need updates for bot-scoped queries
- Constraints: Must remain backward compatible (botId nullable)
- Pattern: Bot-scoped code activation flow unchanged for existing codes
