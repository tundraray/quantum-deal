# Task: Register MultiBotSignalService in bot module

Metadata:
- Phase: 6 (MultiBotSignalService)
- Dependencies: Task 6-1
- Provides: MultiBotSignalService registered for dependency injection
- Size: Small (1 file)
- Verification Level: L3 (Build success)

## Implementation Content

Register `MultiBotSignalService` in the bot module's providers and exports arrays to make it injectable by `WebhookProcessorService` in Phase 7.

## Target Files

- [ ] `libs/bot/src/bot.module.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Read current contents of `bot.module.ts`
- [ ] Note that `BotRegistryService` was added in Task 4-2

### 2. Green Phase
- [ ] Add import for `MultiBotSignalService`
- [ ] Add to providers array
- [ ] Add to exports array

### 3. Refactor Phase
- [ ] Ensure consistent import ordering
- [ ] Verify build succeeds

## Implementation Changes

```typescript
// At the top of the file, add import:
import { MultiBotSignalService } from './services/multi-bot-signal.service';

// In @Module decorator:
@Module({
  // ... existing configuration
  providers: [
    // ... existing providers
    BotRegistryService,      // Added in Task 4-2
    MultiBotSignalService,   // Add this
  ],
  exports: [
    // ... existing exports
    BotRegistryService,      // Added in Task 4-2
    MultiBotSignalService,   // Add this
  ],
})
export class BotModule {}
```

## Completion Criteria

- [ ] Import added for MultiBotSignalService
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
- The service needs to be exported for use by WebhookProcessorService
