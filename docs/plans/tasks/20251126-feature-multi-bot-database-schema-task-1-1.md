# Task: Create bots.ts Schema

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: None (first task)
- Provides: libs/db/src/schema/bots.ts
- Size: Small (1 file)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Create the bots table schema using Drizzle ORM. This is the foundational table for multi-bot architecture that all other new tables and modified columns will reference.

## Target Files
- [x] `libs/db/src/schema/bots.ts` (new file)

## Implementation Steps

### 1. Create Schema File
- [x] Create `libs/db/src/schema/bots.ts`
- [x] Import required Drizzle types: pgTable, bigint, varchar, boolean, timestamp
- [x] Define bots pgTable with columns:
  - id: bigint with generatedAlwaysAsIdentity() (PK)
  - token: varchar(100) NOT NULL
  - name: varchar(100) NOT NULL UNIQUE
  - username: varchar(100) nullable
  - webhookPath: varchar(100) nullable
  - isDynamic: boolean default true NOT NULL
  - isActive: boolean default true NOT NULL
  - createdAt: timestamp with timezone, defaultNow NOT NULL
  - updatedAt: timestamp with timezone, defaultNow NOT NULL

### 2. Export Types
- [x] Export `Bot` type using `typeof bots.$inferSelect`
- [x] Export `NewBot` type using `typeof bots.$inferInsert`

### 3. Verify Compilation
- [x] Run `pnpm typecheck` to verify TypeScript compiles
- [x] No type errors in bots.ts

## Reference Implementation

From Design Doc Section 1.1:
```typescript
import {
  pgTable,
  bigint,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'

export const bots = pgTable('bots', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  token: varchar('token', { length: 100 }).notNull(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  webhookPath: varchar('webhook_path', { length: 100 }),
  isDynamic: boolean('is_dynamic').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert
```

## Completion Criteria
- [x] File `libs/db/src/schema/bots.ts` exists
- [x] All columns defined per Design Doc Section 1.1
- [x] Bot and NewBot types exported
- [x] TypeScript compilation succeeds (`pnpm typecheck`)

## Notes
- Impact scope: This file is referenced by all other Phase 1 tasks
- Constraints: Must use bigint with mode: 'number' for consistency with existing schema
- Pattern: Follow users.ts schema pattern (timestamp with timezone, snake_case columns)

## Acceptance Criteria Reference
From Design Doc AC-1:
- bots table created with all columns: id, token, name, username, webhookPath, isDynamic, isActive, createdAt, updatedAt
- name column has UNIQUE constraint
- id uses bigint with generatedAlwaysAsIdentity()
