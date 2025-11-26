# Task: Create bot-messages.ts Schema

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: Task 1.1 (bots.ts)
- Provides: libs/db/src/schema/bot-messages.ts
- Size: Small (1 file)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Create the bot_messages table schema for per-bot message overrides. This table stores bot-specific message templates that override global messages in the messages table.

## Target Files
- [x] `libs/db/src/schema/bot-messages.ts` (new file)

## Implementation Steps

### 1. Create Schema File
- [x] Import bots from './bots'
- [x] Import required Drizzle types: pgTable, bigint, varchar, text, timestamp, unique
- [x] Define botMessages pgTable with columns:
  - id: bigint with generatedAlwaysAsIdentity() (PK)
  - botId: bigint NOT NULL FK to bots.id with CASCADE
  - type: varchar(50) NOT NULL (message type key)
  - lang: varchar(10) NOT NULL (language code)
  - message: text NOT NULL (override content)
  - createdAt: timestamp with timezone, defaultNow NOT NULL
  - updatedAt: timestamp with timezone, defaultNow NOT NULL
- [x] Add composite unique constraint on (botId, type, lang)

### 2. Export Types
- [x] Export `BotMessage` type using `typeof botMessages.$inferSelect`
- [x] Export `NewBotMessage` type using `typeof botMessages.$inferInsert`

### 3. Verify Compilation
- [x] Run `pnpm typecheck` to verify TypeScript compiles
- [x] No type errors

## Reference Implementation

From Design Doc Section 1.4:
```typescript
import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { bots } from './bots'

export const botMessages = pgTable(
  'bot_messages',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    botId: bigint('bot_id', { mode: 'number' })
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    lang: varchar('lang', { length: 10 }).notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_bot_messages_bot_type_lang').on(table.botId, table.type, table.lang),
  ]
)

export type BotMessage = typeof botMessages.$inferSelect
export type NewBotMessage = typeof botMessages.$inferInsert
```

## Completion Criteria
- [x] File `libs/db/src/schema/bot-messages.ts` exists
- [x] Composite unique constraint on (botId, type, lang) defined
- [x] FK references bots with CASCADE
- [x] TypeScript compilation succeeds

## Notes
- Impact scope: Used by BotMessagesRepository for message resolution
- Constraints: Message type keys should match existing messages table types
- Pattern: Resolution hierarchy per ADR-004 Decision 3:
  bot_messages(botId, type, lang) > messages(type, lang) > hardcoded fallback
