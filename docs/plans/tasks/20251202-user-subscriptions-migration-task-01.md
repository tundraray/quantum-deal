# Task: Update Drizzle Schema - Add botUserId Column

Metadata:
- Phase: 1 (Schema Changes)
- Dependencies: None
- Provides: Updated TypeScript types for `user_subscriptions` table
- Size: Small (1 file)

## Implementation Content
Add `botUserId` column to `user_subscriptions` Drizzle schema with proper FK reference to `bot_users.id`. This column will become the primary foreign key for subscription ownership, replacing the old `userId` column that referenced `users.telegramId`.

**Key Understanding**: `botUserId` references `bot_users.id` which is an auto-generated internal ID (1, 2, 3, ...), NOT `users.telegramId` (large Telegram IDs like 123456789).

## Target Files
- [x] `libs/db/src/schema/user-subscriptions.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No failing tests needed for schema changes (L3 verification)
- [x] Current build should pass before changes

### 2. Green Phase
- [x] Import `botUsers` schema from `./bot-users`
- [x] Add `botUserId` column definition:
  ```typescript
  botUserId: bigint('bot_user_id', { mode: 'number' })
    .references(() => botUsers.id, { onDelete: 'cascade' }),
  ```
  Note: Initially nullable to allow migration to populate data
- [x] Add index definition for `botUserId`:
  ```typescript
  index('idx_user_subscriptions_bot_user').on(table.botUserId),
  ```
- [x] Add JSDoc deprecation comment to existing `userId` column:
  ```typescript
  /**
   * @deprecated Use botUserId instead. References users.telegramId.
   * Will be removed in future migration after validation period.
   */
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.telegramId, { onDelete: 'cascade' }),
  ```

### 3. Refactor Phase
- [x] Ensure imports are properly organized
- [x] Update JSDoc comments for table to reflect the migration status
- [x] Run `npm run build` to verify TypeScript compilation

## Expected Schema After Changes

```typescript
import {
  pgTable,
  timestamp,
  bigint,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { subscriptions } from './subscriptions';
import { bots } from './bots';
import { botUsers } from './bot-users';

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    // NEW: Primary FK to bot-specific user context
    // References bot_users.id (auto-generated internal ID, NOT telegramId)
    botUserId: bigint('bot_user_id', { mode: 'number' })
      .references(() => botUsers.id, { onDelete: 'cascade' }),

    /**
     * @deprecated Use botUserId instead. References users.telegramId.
     * Will be removed in future migration after validation period.
     */
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),

    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),

    botId: bigint('bot_id', { mode: 'number' }).references(() => bots.id, {
      onDelete: 'cascade',
    }),

    activatedAt: timestamp('activated_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_subscriptions_bot').on(table.botId),
    index('idx_user_subscriptions_user_bot').on(table.userId, table.botId),
    index('idx_user_subscriptions_bot_user').on(table.botUserId),
  ],
);

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
```

## Completion Criteria
- [x] `botUserId` column defined with FK to `bot_users.id`
- [x] Index `idx_user_subscriptions_bot_user` defined
- [x] `userId` column has `@deprecated` JSDoc annotation
- [x] TypeScript build succeeds: `npm run build`
- [x] **AC-1.4**: TypeScript types reflect new `botUserId` column

## Verification Commands
```bash
npm run build
```

## Notes
- Impact scope: Schema types only (no runtime behavior changes yet)
- Constraints: Do not modify existing index definitions
- The column is nullable at this stage to allow migration to populate data
- After migration (Task 03), the column will be made NOT NULL in the migration SQL
