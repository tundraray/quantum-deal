# Task: Create BotsRepository with Integration Tests

Metadata:
- Phase: 3 (Create Repositories)
- Dependencies: Phase 2 complete (migration applied)
- Provides: libs/db/src/repositories/bots.repository.ts
- Size: Medium (2 files: repository + tests)
- Verification Level: L2 (Tests pass)

## Implementation Content

Create BotsRepository extending BaseRepository with methods for bot management. Implement integration tests following TDD approach.

## Target Files
- [x] `libs/db/src/repositories/bots.repository.ts` (new file)
- [x] `libs/db/src/repositories/__tests__/bots.repository.int.spec.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write Failing Tests First

Create test file with the following test cases:

```typescript
// libs/db/src/repositories/__tests__/bots.repository.int.spec.ts

describe('BotsRepository', () => {
  describe('create', () => {
    it('should create a bot with all required fields') // AC-1.1
    it('should throw on duplicate name (unique constraint)') // AC-1.2
  })

  describe('findActiveDynamic', () => {
    it('should return only active dynamic bots with settings') // AC-3.1
    it('should return empty array when no dynamic bots exist')
  })

  describe('findByIdWithSettings', () => {
    it('should return bot with joined settings') // AC-3.2
    it('should return null for non-existent bot')
    it('should return bot with null settings if no settings exist')
  })

  describe('findByName', () => {
    it('should return bot by name')
    it('should return null for non-existent name')
  })

  describe('deactivate', () => {
    it('should set isActive to false') // AC-3.4
    it('should return null for non-existent bot')
  })
})
```

**Run tests to confirm they fail:**
```bash
pnpm test -- --testPathPattern="bots.repository.int.spec.ts"
```

### 2. Green Phase - Implement Repository

Create repository with minimal implementation to pass tests:

```typescript
// libs/db/src/repositories/bots.repository.ts

import { Injectable, Inject } from '@nestjs/common'
import { eq, and } from 'drizzle-orm'
import { BaseRepository } from './base.repository'
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider'
import { bots, Bot, NewBot } from '../schema/bots'
import { botSettings, BotSettings, PaymentSettings } from '../schema/bot-settings'

export interface BotWithSettings extends Bot {
  settings: BotSettings | null
  paymentSettings: PaymentSettings | null
}

@Injectable()
export class BotsRepository extends BaseRepository<Bot, NewBot, number> {
  protected table = bots
  protected idColumn = bots.id

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db)
  }

  async findActiveDynamic(): Promise<BotWithSettings[]> {
    // Implementation per Design Doc
  }

  async findByIdWithSettings(id: number): Promise<BotWithSettings | null> {
    // Implementation per Design Doc
  }

  async findByName(name: string): Promise<Bot | null> {
    return this.findOneBy(eq(bots.name, name))
  }

  async findByUsername(username: string): Promise<Bot | null> {
    return this.findOneBy(eq(bots.username, username))
  }

  async findByWebhookPath(webhookPath: string): Promise<Bot | null> {
    return this.findOneBy(eq(bots.webhookPath, webhookPath))
  }

  async deactivate(id: number): Promise<Bot | null> {
    return this.update(id, { isActive: false })
  }

  async activate(id: number): Promise<Bot | null> {
    return this.update(id, { isActive: true })
  }
}
```

**Run tests to confirm they pass:**
```bash
pnpm test -- --testPathPattern="bots.repository.int.spec.ts"
```

### 3. Refactor Phase

- [x] Review code for duplication
- [x] Improve error handling if needed
- [x] Add JSDoc comments
- [x] Ensure tests still pass

## Reference Implementation

See Design Doc Section 3.1 for complete implementation.

## Completion Criteria
- [x] BotsRepository class created extending BaseRepository
- [x] All 9 test cases implemented and passing
- [x] findActiveDynamic() returns active dynamic bots with settings (JOIN)
- [x] findByIdWithSettings() returns joined data
- [x] deactivate() soft delete behavior works
- [x] TypeScript compilation succeeds

## Test Case Summary (12 tests implemented)

| Test Case | AC Reference | Status |
|-----------|-------------|--------|
| Create bot with all fields | AC-1.1 | Complete |
| Unique constraint on name | AC-1.2 | Complete |
| Create bot without optional fields | AC-1.3 | Complete |
| findActiveDynamic returns correct results | AC-3.1 | Complete |
| findActiveDynamic empty array | - | Complete |
| findByIdWithSettings JOIN | AC-3.2 | Complete |
| findByIdWithSettings null | - | Complete |
| findByIdWithSettings no settings | - | Complete |
| findByName returns bot | AC-3.3 | Complete |
| findByName returns null for non-existent | - | Complete |
| deactivate sets isActive false | AC-3.4 | Complete |
| deactivate returns null for non-existent | - | Complete |
| BaseRepository methods work (findById, create, update, delete) | AC-5.1 | Complete |

## Notes
- Impact scope: Core repository for bot management
- Constraints: Must extend BaseRepository pattern
- Integration tests require database connection
- Use existing test helpers for database setup/teardown
