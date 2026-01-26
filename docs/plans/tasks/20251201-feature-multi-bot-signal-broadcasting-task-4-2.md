# Task: Register BotRegistryService in bot module

Metadata:
- Phase: 4 (BotRegistryService)
- Dependencies: Task 4-1
- Provides: BotRegistryService registered for dependency injection
- Size: Small (1 file)
- Verification Level: L3 (Build success)

## Implementation Content

Register `BotRegistryService` in the bot module's providers and exports arrays to make it injectable by other services (specifically `MultiBotSignalService` in Phase 6).

## Target Files

- [ ] `libs/bot/src/bot.module.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Read current contents of `bot.module.ts`
- [ ] Identify providers and exports arrays

### 2. Green Phase
- [ ] Add import for `BotRegistryService`
- [ ] Add to providers array
- [ ] Add to exports array

### 3. Refactor Phase
- [ ] Ensure consistent import ordering
- [ ] Verify build succeeds

## Implementation Changes

```typescript
// At the top of the file, add import:
import { BotRegistryService } from './services/bot-registry.service';

// In @Module decorator:
@Module({
  // ... existing configuration
  providers: [
    // ... existing providers
    BotRegistryService,
  ],
  exports: [
    // ... existing exports
    BotRegistryService,
  ],
})
export class BotModule {}
```

## Completion Criteria

- [ ] Import added for BotRegistryService
- [ ] Service added to providers array
- [ ] Service added to exports array
- [ ] Build succeeds (`npm run build`)

## Verification Commands

```bash
# Build verification
npm run build

# Type check
npx tsc --noEmit
```

## Notes

- Impact scope: Module registration only
- Constraints: Must not remove existing providers/exports
- The service needs to be exported for use by other modules
