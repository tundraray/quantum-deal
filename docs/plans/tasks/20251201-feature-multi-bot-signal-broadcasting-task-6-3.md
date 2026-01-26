# Task: Update package exports

Metadata:
- Phase: 6 (MultiBotSignalService)
- Dependencies: Task 6-1, Task 6-2
- Provides: Services exportable from `@quantumdeal/bot`
- Size: Small (2 files)
- Verification Level: L3 (Build success)

## Implementation Content

Update the package barrel files to export `MultiBotSignalService` and `BotRegistryService` from `@quantumdeal/bot`. This enables external modules to import these services if needed.

**IMPORTANT**: Preserve all existing exports. Only ADD new exports.

## Target Files

- [ ] `libs/bot/src/index.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Read current contents of `libs/bot/src/index.ts`
- [ ] Identify existing exports (must not be removed)

### 2. Green Phase
- [ ] Add exports for new services:
  - `export * from './services/multi-bot-signal.service';`
  - `export * from './services/bot-registry.service';`
- [ ] Run `npm run build` to verify

### 3. Refactor Phase
- [ ] Organize exports (existing first, then new with comment)

## Implementation Code

```typescript
// libs/bot/src/index.ts

// ============================================================
// EXISTING EXPORTS (DO NOT REMOVE)
// ============================================================
export * from './bot.module';
export * from './services/webhook.service';
export * from './services/week-report.service';
export * from './services/notification.service';
export * from './services/dynamic-bot-config.service';
export * from './constants';
export * from './middleware';
export * from './interfaces';

// ============================================================
// NEW EXPORTS (ADR-007: Multi-bot signal broadcasting)
// ============================================================
export * from './services/multi-bot-signal.service';
export * from './services/bot-registry.service';
```

## Completion Criteria

- [ ] Existing exports preserved
- [ ] New service exports added
- [ ] Build succeeds (`npm run build`)
- [ ] Services importable from `@quantumdeal/bot`

## Verification Commands

```bash
# Verify build
npm run build

# Verify services are accessible (manual check in IDE)
# import { MultiBotSignalService, BotRegistryService } from '@quantumdeal/bot'
```

## Notes

- Impact scope: Export aggregation only
- Constraints: Must not break existing imports
- This enables external modules to access the new services if needed
