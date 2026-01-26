# Task: Create bot-users.ts Schema

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: Task 1.1 (bots.ts), existing users.ts
- Provides: libs/db/src/schema/bot-users.ts
- Size: Small (1 file)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Create the bot_users table schema for per-bot user settings. This is a many-to-many relationship table storing bot-specific language, preferences, and conversation state for each user-bot combination.

## Target Files
- [x] `libs/db/src/schema/bot-users.ts` (new file)

## Implementation Steps

### 1. Define TypeScript Interfaces
- [x] Create `BotUserPreferences` interface with:
  - notifications?: { signals?, broadcasts?, reminders? }
  - display?: { showPips?, showPercentage? }
- [x] Create `BotUserState` interface with:
  - currentScene?, sceneData?, lastCommand?, lastCommandAt?

### 2. Create Schema File
- [x] Import users from './users'
- [x] Import bots from './bots'
- [x] Import unique from 'drizzle-orm/pg-core'
- [x] Define botUsers pgTable with columns:
  - id: bigint with generatedAlwaysAsIdentity() (PK)
  - userId: bigint NOT NULL FK to users.telegramId with CASCADE
  - botId: bigint NOT NULL FK to bots.id with CASCADE
  - lang: varchar(10) nullable
  - preferences: jsonb with $type<BotUserPreferences>() nullable
  - state: jsonb with $type<BotUserState>() nullable
  - isActive: boolean default true NOT NULL
  - createdAt: timestamp with timezone, defaultNow NOT NULL
  - updatedAt: timestamp with timezone, defaultNow NOT NULL
- [x] Add composite unique constraint on (userId, botId)

### 3. Export Types
- [x] Export `BotUser` type using `typeof botUsers.$inferSelect`
- [x] Export `NewBotUser` type using `typeof botUsers.$inferInsert`

### 4. Verify Compilation
- [x] Run `pnpm typecheck` to verify TypeScript compiles
- [x] No type errors

## Reference Implementation

From Design Doc Section 1.3:
```typescript
import {
  pgTable,
  bigint,
  varchar,
  jsonb,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { bots } from './bots'

export interface BotUserPreferences {
  notifications?: {
    signals?: boolean
    broadcasts?: boolean
    reminders?: boolean
  }
  display?: {
    showPips?: boolean
    showPercentage?: boolean
  }
}

export interface BotUserState {
  currentScene?: string
  sceneData?: Record<string, unknown>
  lastCommand?: string
  lastCommandAt?: string
}

export const botUsers = pgTable(
  'bot_users',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),
    botId: bigint('bot_id', { mode: 'number' })
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    lang: varchar('lang', { length: 10 }),
    preferences: jsonb('preferences').$type<BotUserPreferences>(),
    state: jsonb('state').$type<BotUserState>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_bot_users_user_bot').on(table.userId, table.botId),
  ]
)

export type BotUser = typeof botUsers.$inferSelect
export type NewBotUser = typeof botUsers.$inferInsert
```

## Completion Criteria
- [x] File `libs/db/src/schema/bot-users.ts` exists
- [x] BotUserPreferences and BotUserState interfaces defined
- [x] Composite unique constraint on (userId, botId) defined
- [x] FKs reference users and bots with CASCADE
- [x] TypeScript compilation succeeds

## Notes
- Impact scope: Core table for per-bot user settings
- Constraints: Uses users.telegramId (not users.id) as FK per existing schema
- Pattern: Language resolution hierarchy: bot_users.lang > users.lang > system default
