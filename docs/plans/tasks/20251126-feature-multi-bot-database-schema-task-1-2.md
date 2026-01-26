# Task: Create bot-settings.ts Schema

Metadata:
- Phase: 1 (Create All Schema Files)
- Dependencies: Task 1.1 (bots.ts must exist for FK reference)
- Provides: libs/db/src/schema/bot-settings.ts
- Size: Small (1 file)
- Verification Level: L3 (TypeScript compilation)

## Implementation Content

Create the bot_settings table schema with 1:1 relationship to bots. This table stores JSONB settings for each bot, enabling flexible feature flags without schema migrations.

## Target Files
- [x] `libs/db/src/schema/bot-settings.ts` (new file)

## Implementation Steps

### 1. Define TypeScript Interfaces
- [x] Create `BotSettings` interface with:
  - features: { trialEnabled, paymentsEnabled, signalsEnabled, broadcastEnabled }
  - defaults: { subscriptionDays, trialDays, language }
  - ui?: { welcomeImage?, brandColor? }
- [x] Create `PaymentSettings` interface with:
  - starsEnabled, minAmount, maxAmount, refundWindowHours

### 2. Create Default Settings Constant
- [x] Define `DEFAULT_BOT_SETTINGS` constant matching BotSettings interface

### 3. Create Schema File
- [x] Import bots from './bots'
- [x] Define botSettings pgTable with columns:
  - id: bigint with generatedAlwaysAsIdentity() (PK)
  - botId: bigint NOT NULL UNIQUE FK to bots.id with CASCADE
  - settings: jsonb with $type<BotSettings>() default DEFAULT_BOT_SETTINGS
  - paymentSettings: jsonb with $type<PaymentSettings>() nullable
  - createdAt: timestamp with timezone, defaultNow NOT NULL
  - updatedAt: timestamp with timezone, defaultNow NOT NULL

### 4. Export Types
- [x] Export `BotSettingsRecord` type using `typeof botSettings.$inferSelect`
- [x] Export `NewBotSettingsRecord` type using `typeof botSettings.$inferInsert`

### 5. Verify Compilation
- [x] Run `pnpm build` to verify TypeScript compiles
- [x] No type errors

## Reference Implementation

From Design Doc Section 1.2:
```typescript
import { pgTable, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { bots } from './bots'

export interface BotSettings {
  features: {
    trialEnabled: boolean
    paymentsEnabled: boolean
    signalsEnabled: boolean
    broadcastEnabled: boolean
  }
  defaults: {
    subscriptionDays: number
    trialDays: number
    language: string
  }
  ui?: {
    welcomeImage?: string
    brandColor?: string
  }
}

export interface PaymentSettings {
  starsEnabled: boolean
  minAmount: number
  maxAmount: number
  refundWindowHours: number
}

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  features: {
    trialEnabled: true,
    paymentsEnabled: true,
    signalsEnabled: true,
    broadcastEnabled: false,
  },
  defaults: {
    subscriptionDays: 30,
    trialDays: 7,
    language: 'en',
  },
}

export const botSettings = pgTable('bot_settings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  botId: bigint('bot_id', { mode: 'number' })
    .notNull()
    .unique()
    .references(() => bots.id, { onDelete: 'cascade' }),
  settings: jsonb('settings').$type<BotSettings>().notNull().default(DEFAULT_BOT_SETTINGS),
  paymentSettings: jsonb('payment_settings').$type<PaymentSettings>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type BotSettingsRecord = typeof botSettings.$inferSelect
export type NewBotSettingsRecord = typeof botSettings.$inferInsert
```

## Completion Criteria
- [x] File `libs/db/src/schema/bot-settings.ts` exists
- [x] BotSettings and PaymentSettings interfaces defined
- [x] DEFAULT_BOT_SETTINGS constant exported
- [x] botId has UNIQUE constraint (1:1 with bots)
- [x] CASCADE delete configured on botId FK
- [x] TypeScript compilation succeeds

## Notes
- Impact scope: Referenced by BotsRepository for JOIN queries
- Constraints: botId must be UNIQUE to enforce 1:1 relationship
- Pattern: Use $type<T>() for JSONB type safety per ADR-004 Decision 5
