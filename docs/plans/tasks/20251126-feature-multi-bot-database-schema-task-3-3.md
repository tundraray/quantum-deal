# Task: Create BotUsersRepository with Integration Tests

Metadata:
- Phase: 3 (Create Repositories)
- Dependencies: Phase 2 complete, Task 3.1 (BotsRepository)
- Provides: libs/db/src/repositories/bot-users.repository.ts
- Size: Medium (2 files: repository + tests)
- Verification Level: L2 (Tests pass)

## Implementation Content

Create BotUsersRepository for managing per-bot user settings, preferences, and conversation state. Implement language resolution hierarchy.

## Target Files
- [x] `libs/db/src/repositories/bot-users.repository.ts` (new file)
- [x] `libs/db/src/repositories/__tests__/bot-users.repository.int.spec.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write Failing Tests First

Create test file with the following test cases:

```typescript
// libs/db/src/repositories/__tests__/bot-users.repository.int.spec.ts

describe('BotUsersRepository', () => {
  describe('findByUserAndBot', () => {
    it('should return bot-user record') // AC-3.1
    it('should return null for non-existent combination')
  })

  describe('findOrCreate', () => {
    it('should return existing record if exists') // AC-3.2
    it('should create new record if not exists') // AC-3.2
    it('should throw on unique constraint violation (duplicate userId+botId)') // AC-1.1
  })

  describe('findActiveUsersWithDetailsByBotId', () => {
    it('should return bot users with user details via JOIN') // AC-3.3
    it('should only return active users and bot_users')
  })

  describe('resolveLanguage', () => {
    it('should return bot_users.lang if set') // AC-3.4
    it('should return users.lang if bot_users.lang is null') // AC-3.4
    it('should return default lang if both are null') // AC-3.4
  })

  describe('CASCADE delete behavior', () => {
    it('should delete bot_users when bot is deleted') // AC-1.2
  })
})
```

**Run tests to confirm they fail:**
```bash
pnpm test -- --testPathPattern="bot-users.repository.int.spec.ts"
```

### 2. Green Phase - Implement Repository

Create repository with minimal implementation to pass tests:

```typescript
// libs/db/src/repositories/bot-users.repository.ts

import { Injectable, Inject } from '@nestjs/common'
import { eq, and } from 'drizzle-orm'
import { BaseRepository } from './base.repository'
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider'
import { botUsers, BotUser, NewBotUser, BotUserPreferences, BotUserState } from '../schema/bot-users'
import { users, User } from '../schema/users'

@Injectable()
export class BotUsersRepository extends BaseRepository<BotUser, NewBotUser, number> {
  protected table = botUsers
  protected idColumn = botUsers.id

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db)
  }

  async findByUserAndBot(userId: number, botId: number): Promise<BotUser | null> {
    // Implementation per Design Doc
  }

  async findOrCreate(
    userId: number,
    botId: number,
    defaults?: Partial<NewBotUser>
  ): Promise<BotUser> {
    // Implementation per Design Doc
  }

  async findActiveUsersWithDetailsByBotId(botId: number): Promise<
    Array<{ botUser: BotUser; user: User }>
  > {
    // Implementation per Design Doc
  }

  async resolveLanguage(userId: number, botId: number, defaultLang = 'en'): Promise<string> {
    // Implementation per Design Doc
  }

  // Additional methods: updateLanguage, updatePreferences, updateState, activate, deactivate
}
```

**Run tests to confirm they pass:**
```bash
pnpm test -- --testPathPattern="bot-users.repository.int.spec.ts"
```

### 3. Refactor Phase

- [x] Review code for duplication
- [x] Ensure language resolution hierarchy is correct
- [x] Add JSDoc comments
- [x] Ensure tests still pass

## Reference Implementation

See Design Doc Section 3.3 for complete implementation.

## Completion Criteria
- [x] BotUsersRepository class created extending BaseRepository
- [x] All 9 test cases implemented and passing
- [x] findByUserAndBot() returns correct record
- [x] findOrCreate() works correctly
- [x] findActiveUsersWithDetailsByBotId() returns JOIN data
- [x] resolveLanguage() follows hierarchy (bot_users.lang > users.lang > default)
- [x] TypeScript compilation succeeds

## Test Case Summary (22 tests implemented)

| Test Case | AC Reference | Status |
|-----------|-------------|--------|
| findByUserAndBot returns record | AC-3.1 | Done |
| findByUserAndBot returns null | - | Done |
| findOrCreate returns existing | AC-3.2 | Done |
| findOrCreate creates new | AC-3.2 | Done |
| Unique constraint violation | AC-1.1 | Done |
| findActiveUsersWithDetailsByBotId JOIN | AC-3.3 | Done |
| Only active users returned | - | Done |
| resolveLanguage bot_users.lang | AC-3.4 | Done |
| resolveLanguage users.lang fallback | AC-3.4 | Done |
| resolveLanguage default | AC-3.4 | Done |
| CASCADE delete | AC-1.2 | Done |
| JSONB columns store preferences/state | AC-1.3 | Done |
| deactivate() sets isActive false | - | Done |
| activate() sets isActive true | - | Done |
| updateLanguage() updates language | - | Done |
| updatePreferences() updates preferences | - | Done |
| updateState() updates state | - | Done |

## Notes
- Impact scope: Core table for user-bot relationships
- Constraints: References both users.telegramId and bots.id
- Language hierarchy: bot_users.lang > users.lang > system default ('en')
- Test setup requires creating both user and bot first
