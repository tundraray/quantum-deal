# Task: Create BotSettingsRepository with Integration Tests

Metadata:
- Phase: 3 (Create Repositories)
- Dependencies: Phase 2 complete (migration applied), Task 3.1 (BotsRepository for test data)
- Provides: libs/db/src/repositories/bot-settings.repository.ts
- Size: Medium (2 files: repository + tests)
- Verification Level: L2 (Tests pass)

## Implementation Content

Create BotSettingsRepository for managing bot-specific settings with JSONB storage. Implement upsert and partial update methods.

## Target Files
- [x] `libs/db/src/repositories/bot-settings.repository.ts` (new file)
- [x] `libs/db/src/repositories/__tests__/bot-settings.repository.int.spec.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write Failing Tests First

Create test file with the following test cases:

```typescript
// libs/db/src/repositories/__tests__/bot-settings.repository.int.spec.ts

describe('BotSettingsRepository', () => {
  describe('findByBotId', () => {
    it('should return settings by bot ID') // AC-3.1
    it('should return null for non-existent bot')
  })

  describe('upsert', () => {
    it('should create settings if not exists') // AC-3.2
    it('should update settings if exists') // AC-3.2
    it('should throw on FK violation (non-existent bot)') // AC-1.1
  })

  describe('updateFeatureFlags', () => {
    it('should merge partial feature flags') // AC-3.3
    it('should preserve existing features not in update')
    it('should return null for non-existent settings')
  })
})
```

**Run tests to confirm they fail:**
```bash
pnpm test -- --testPathPattern="bot-settings.repository.int.spec.ts"
```

### 2. Green Phase - Implement Repository

Create repository with minimal implementation to pass tests:

```typescript
// libs/db/src/repositories/bot-settings.repository.ts

import { Injectable, Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { BaseRepository } from './base.repository'
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider'
import {
  botSettings,
  BotSettingsRecord,
  NewBotSettingsRecord,
  BotSettings,
  PaymentSettings,
} from '../schema/bot-settings'

@Injectable()
export class BotSettingsRepository extends BaseRepository<
  BotSettingsRecord,
  NewBotSettingsRecord,
  number
> {
  protected table = botSettings
  protected idColumn = botSettings.id

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db)
  }

  async findByBotId(botId: number): Promise<BotSettingsRecord | null> {
    return this.findOneBy(eq(botSettings.botId, botId))
  }

  async upsert(
    botId: number,
    data: { settings?: BotSettings; paymentSettings?: PaymentSettings }
  ): Promise<BotSettingsRecord> {
    // Implementation per Design Doc
  }

  async updateFeatureFlags(
    botId: number,
    features: Partial<BotSettings['features']>
  ): Promise<BotSettingsRecord | null> {
    // Implementation per Design Doc
  }
}
```

**Run tests to confirm they pass:**
```bash
pnpm test -- --testPathPattern="bot-settings.repository.int.spec.ts"
```

### 3. Refactor Phase

- [x] Review code for duplication
- [x] Ensure JSONB merge logic is correct
- [x] Add JSDoc comments
- [x] Ensure tests still pass

## Reference Implementation

See Design Doc Section 3.2 for complete implementation.

## Completion Criteria
- [x] BotSettingsRepository class created extending BaseRepository
- [x] All 11 test cases implemented and passing
- [x] findByBotId() returns settings for bot
- [x] upsert() creates or updates settings correctly
- [x] updateFeatureFlags() merges partial updates
- [x] TypeScript compilation succeeds

## Test Case Summary (11 tests)

| Test Case | AC Reference | Status |
|-----------|-------------|--------|
| AC-1.1: FK reference works | AC-1.1 | Completed |
| AC-1.2: Unique botId constraint | AC-1.2 | Completed |
| AC-1.3: CASCADE delete | AC-1.3 | Completed |
| findByBotId returns settings | AC-3.1 | Completed |
| findByBotId returns null | - | Completed |
| upsert creates new | AC-3.2 | Completed |
| upsert updates existing | AC-3.2 | Completed |
| FK violation on upsert | AC-1.1 | Completed |
| updateFeatureFlags merges | AC-3.3 | Completed |
| updateFeatureFlags returns null | - | Completed |
| Default settings applied | JSONB.1 | Completed |
| JSONB serialization | JSONB.2 | Completed |

## Notes
- Impact scope: Bot configuration management
- Constraints: JSONB merge requires reading current value first
- 1:1 relationship with bots table enforced by UNIQUE constraint
- Test setup requires creating bot first (BotsRepository)
