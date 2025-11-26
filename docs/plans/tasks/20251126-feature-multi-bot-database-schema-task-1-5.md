# Task: Modify user-subscriptions.ts - Add botId Column

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: Task 1.1 (bots.ts)
- Provides: Modified libs/db/src/schema/user-subscriptions.ts
- Size: Small (1 file modification)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Add botId column to user_subscriptions table to scope subscriptions to specific bots. The column is nullable for backward compatibility during migration.

## Target Files
- [x] `libs/db/src/schema/user-subscriptions.ts` (modify existing)

## Implementation Steps

### 1. Read Existing File
- [x] Read current user-subscriptions.ts to understand existing structure
- [x] Identify import section, columns, and constraints

### 2. Add Import
- [x] Add import for bots: `import { bots } from './bots'`

### 3. Add botId Column
- [x] Add botId column after subscriptionId:
  ```typescript
  botId: bigint('bot_id', { mode: 'number' })
    .references(() => bots.id, { onDelete: 'cascade' }),
  ```
- [x] Column is nullable for backward compatibility

### 4. Add Indexes
- [x] Add index on botId: `index('idx_user_subscriptions_bot').on(table.botId)`
- [x] Add composite index: `index('idx_user_subscriptions_user_bot').on(table.userId, table.botId)`

### 5. Verify Type Export
- [x] Ensure UserSubscription type now includes botId (optional)
- [x] Ensure NewUserSubscription type includes botId (optional)

### 6. Verify Compilation
- [x] Run `pnpm typecheck` to verify TypeScript compiles
- [x] No type errors

## Reference Implementation

From Design Doc Section 2.1:
```typescript
import { pgTable, timestamp, bigint, boolean, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { subscriptions } from './subscriptions'
import { bots } from './bots'

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    botId: bigint('bot_id', { mode: 'number' })
      .references(() => bots.id, { onDelete: 'cascade' }),
    activatedAt: timestamp('activated_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_subscriptions_bot').on(table.botId),
    index('idx_user_subscriptions_user_bot').on(table.userId, table.botId),
  ]
)

export type UserSubscription = typeof userSubscriptions.$inferSelect
export type NewUserSubscription = typeof userSubscriptions.$inferInsert
```

## Completion Criteria
- [x] bots import added to user-subscriptions.ts
- [x] botId column added with FK to bots.id
- [x] botId is nullable for backward compatibility
- [x] Indexes created for bot-scoped queries
- [x] UserSubscription type includes botId
- [x] TypeScript compilation succeeds

## Notes
- Impact scope: UserSubscriptionsRepository may need updates (Phase 3+)
- Constraints: Must remain backward compatible (botId nullable)
- Important: Partial unique index (FR-012) will be added manually in Phase 2 Task 2.3
  (Drizzle does not support partial indexes declaratively)
