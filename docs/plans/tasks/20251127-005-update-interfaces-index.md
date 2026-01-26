# Task: Update interfaces/index.ts Exports

Metadata:
- Phase: 1 (Foundation)
- Dependencies: Task 20251127-003 (interfaces created)
- Provides: Public API exports for new interfaces
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Update the interfaces barrel export file to include all new dynamic module interfaces for public API access.

Design Doc Reference: Section "Implementation Plan" - Index exports update

## Target Files
- [x] `libs/telegraf/src/interfaces/index.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No tests needed for export-only file (L3 verification)
- [x] Red state maintained from Phase 0

### 2. Green Phase
- [x] Read existing `interfaces/index.ts` file
- [x] Add export for all new interfaces:
  ```typescript
  // Already implemented via: export * from './dynamic-telegraf-options.interface';
  // This exports all interfaces including:
  // DynamicBotConfig, BotSettings, BotConfigurationProvider,
  // TelegrafDynamicModuleOptions, TelegrafDynamicModuleAsyncOptions,
  // DynamicBotInstance, BotInitResult, DynamicBotStats,
  // BOT_CONFIGURATION_PROVIDER
  ```

### 3. Refactor Phase
- [x] Organize exports in logical order
- [x] Ensure consistent with existing export patterns
- [x] Run build to verify exports resolve

## Exports to Add

| Export | Type | Source |
|--------|------|--------|
| `DynamicBotConfig` | interface | dynamic-telegraf-options.interface.ts |
| `BotSettings` | interface | dynamic-telegraf-options.interface.ts |
| `BotConfigurationProvider` | interface | dynamic-telegraf-options.interface.ts |
| `TelegrafDynamicModuleOptions` | interface | dynamic-telegraf-options.interface.ts |
| `TelegrafDynamicModuleAsyncOptions` | interface | dynamic-telegraf-options.interface.ts |
| `DynamicBotInstance` | interface | dynamic-telegraf-options.interface.ts |
| `BotInitResult` | interface | dynamic-telegraf-options.interface.ts |
| `DynamicBotStats` | interface | dynamic-telegraf-options.interface.ts |
| `BOT_CONFIGURATION_PROVIDER` | const | dynamic-telegraf-options.interface.ts |

## Completion Criteria
- [x] All new types exported from interfaces/index.ts
- [x] Existing exports unchanged
- [x] `npm run build` passes
- [x] Types accessible via: `import { DynamicBotConfig } from './interfaces'`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: Additive changes only to existing barrel file
- Constraints: Do not modify or remove any existing exports
- This enables consumers to import types from the package root
