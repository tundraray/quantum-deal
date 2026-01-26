# Task: Update index.ts Package Exports

Metadata:
- Phase: 4 (Module Integration)
- Dependencies: Task 20251127-028 (forRootDynamic method)
- Provides: Complete public API exports
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Update the package root index.ts to ensure all new modules, interfaces, and decorators are properly exported for consumer access.

Design Doc Reference: Section "Implementation Plan" - Index exports update

## Target Files
- [x] `libs/telegraf/src/index.ts` (verify - already complete)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No tests needed for export-only file (L3 verification)

### 2. Green Phase
- [x] Read existing `index.ts` file
- [x] Ensure the following are exported (may already be via re-exports):
  - From `interfaces/index.ts`:
    - All dynamic module interfaces (DynamicBotConfig, BotSettings, BotConfigurationProvider, TelegrafDynamicModuleOptions, DynamicBotInstance)
    - BOT_CONFIGURATION_PROVIDER token
  - From `decorators/core/index.ts`:
    - ForBot decorator
    - RequiresFeature decorator
  - From `services/index.ts`:
    - DynamicTelegrafService
    - DynamicListenersExplorerService
  - DynamicTelegrafCoreModule (if needed for advanced use cases)
- [x] Export already present via wildcard re-export:
  ```typescript
  export * from './dynamic-telegraf-core.module'
  ```
- [x] Verify re-exports cascade correctly (verified via build success)

### 3. Refactor Phase
- [x] Organize exports in logical groups (already well-organized by category)
- [x] Run build to verify all exports resolve (npm run build: success)

## Expected Public API After Update

```typescript
// Modules
import { TelegrafModule, DynamicTelegrafCoreModule } from '@libs/telegraf'

// Interfaces
import {
  DynamicBotConfig,
  BotSettings,
  BotConfigurationProvider,
  TelegrafDynamicModuleOptions,
  DynamicBotInstance,
  BOT_CONFIGURATION_PROVIDER,
} from '@libs/telegraf'

// Decorators
import { ForBot, RequiresFeature } from '@libs/telegraf'

// Services
import { DynamicTelegrafService, DynamicListenersExplorerService } from '@libs/telegraf'
```

## Completion Criteria
- [x] All new types, decorators, and services exported
- [x] Existing exports unchanged
- [x] `npm run build` passes
- [x] All imports from package root work correctly (verified via export chain analysis)

## Verification Commands
```bash
npm run build
npm run check
npm run check:unused
```

## Notes
- Impact scope: Package root index.ts
- Constraints: Do not break existing imports
- This ensures consumers can import from package root
