# Task: Create BotMessagesRepository with Integration Tests

Metadata:
- Phase: 3 (Create Repositories)
- Dependencies: Phase 2 complete, Task 3.1 (BotsRepository)
- Provides: libs/db/src/repositories/bot-messages.repository.ts
- Size: Medium (2 files: repository + tests)
- Verification Level: L2 (Tests pass)

## Implementation Content

Create BotMessagesRepository for managing per-bot message overrides. Implement message resolution with full hierarchy (bot override > global > English > hardcoded).

## Target Files
- [x] `libs/db/src/repositories/bot-messages.repository.ts` (new file)
- [x] `libs/db/src/repositories/__tests__/bot-messages.repository.int.spec.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write Failing Tests First

Create test file with the following test cases:

```typescript
// libs/db/src/repositories/__tests__/bot-messages.repository.int.spec.ts

describe('BotMessagesRepository', () => {
  describe('findByBotTypeAndLang', () => {
    it('should find message by bot, type, and lang')
    it('should return null for non-existent combination')
  })

  describe('resolveMessage', () => {
    it('should return bot override if exists') // AC-3.1
    it('should fall back to global default if no override') // AC-3.2
    it('should fall back to English if lang not found') // AC-3.3
    it('should return hardcoded fallback if nothing found') // AC-3.4
    it('should work with null botId (global only)')
  })

  describe('upsert', () => {
    it('should create message if not exists') // AC-3.5
    it('should update message if exists') // AC-3.5
  })

  describe('deleteOverride', () => {
    it('should delete existing override')
    it('should return false for non-existent override')
  })

  describe('CASCADE behavior', () => {
    it('should delete messages when bot is deleted') // AC-1.2
  })

  describe('unique constraint', () => {
    it('should enforce unique (botId, type, lang)') // AC-1.1
  })
})
```

**Run tests to confirm they fail:**
```bash
pnpm test -- --testPathPattern="bot-messages.repository.int.spec.ts"
```

### 2. Green Phase - Implement Repository

Create repository with minimal implementation to pass tests:

```typescript
// libs/db/src/repositories/bot-messages.repository.ts

import { Injectable, Inject, Logger } from '@nestjs/common'
import { eq, and } from 'drizzle-orm'
import { BaseRepository } from './base.repository'
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider'
import { botMessages, BotMessage, NewBotMessage } from '../schema/bot-messages'
import { messages } from '../schema/messages'

@Injectable()
export class BotMessagesRepository extends BaseRepository<
  BotMessage,
  NewBotMessage,
  number
> {
  protected table = botMessages
  protected idColumn = botMessages.id
  private readonly logger = new Logger(BotMessagesRepository.name)

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db)
  }

  async findByBotTypeAndLang(
    botId: number,
    type: string,
    lang: string
  ): Promise<BotMessage | null> {
    // Implementation per Design Doc
  }

  async resolveMessage(
    botId: number | null,
    type: string,
    lang: string
  ): Promise<string> {
    // Implementation per Design Doc - full hierarchy
  }

  async upsert(
    botId: number,
    type: string,
    lang: string,
    message: string
  ): Promise<BotMessage> {
    // Implementation per Design Doc
  }

  async deleteOverride(botId: number, type: string, lang: string): Promise<boolean> {
    // Implementation per Design Doc
  }

  private getHardcodedFallback(type: string, lang: string): string {
    // Implementation per Design Doc
  }
}
```

**Run tests to confirm they pass:**
```bash
pnpm test -- --testPathPattern="bot-messages.repository.int.spec.ts"
```

### 3. Refactor Phase

- [x] Review code for duplication
- [x] Ensure message resolution hierarchy is correct
- [x] Add appropriate logging for fallbacks
- [x] Ensure tests still pass

## Reference Implementation

See Design Doc Section 3.4 for complete implementation.

## Message Resolution Hierarchy

Per ADR-004 Decision 3:
1. Bot-specific override (bot_messages table)
2. Global default (messages table)
3. English fallback (if requested lang not found in messages)
4. Hardcoded fallback (emergency fallback for critical messages)

```
resolveMessage(botId, type, lang)
  |
  v
Check bot_messages(botId, type, lang) -----> Found? Return message
  |
  v (not found)
Check messages(type, lang) -----> Found? Return message
  |
  v (not found)
Check messages(type, 'en') -----> Found? Return message
  |
  v (not found)
Return hardcoded fallback
```

## Completion Criteria
- [x] BotMessagesRepository class created extending BaseRepository
- [x] All 9 test cases implemented and passing
- [x] resolveMessage() follows complete hierarchy
- [x] upsert() creates or updates correctly
- [x] TypeScript compilation succeeds

## Test Case Summary (14 tests implemented)

| Test Case | AC Reference | Status |
|-----------|-------------|--------|
| findByBotTypeAndLang returns message | AC-LOOKUP.1 | Completed |
| findByBotTypeAndLang returns null | - | Completed |
| resolveMessage bot override | AC-3.1 | Completed |
| resolveMessage global fallback | AC-3.2 | Completed |
| resolveMessage English fallback | AC-3.3 | Completed |
| resolveMessage hardcoded fallback | AC-3.4 | Completed |
| resolveMessage null botId | - | Completed |
| upsert creates new and updates existing | AC-3.5 | Completed |
| CASCADE delete | AC-1.2 | Completed |
| unique constraint (botId, type, lang) | AC-1.1 | Completed |
| findAllByBotId returns all messages | AC-LOOKUP.2 | Completed |
| findAllByType returns by type | - | Completed |
| deleteOverride deletes | - | Completed |
| deleteOverride returns false for non-existent | - | Completed |

## Notes
- Impact scope: Message localization for bots
- Constraints: Must integrate with existing messages table
- Resolution hierarchy is critical for correct behavior
- Hardcoded fallbacks should cover essential message types
