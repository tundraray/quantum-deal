# Task: Create Dynamic Telegraf Options Interface

Metadata:
- Phase: 1 (Foundation)
- Dependencies: Phase 0 completion
- Provides: Type definitions for all dynamic module components
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Create the interface definitions file containing all types required by the Dynamic Telegraf module components. This is the foundation for all other components.

Design Doc Reference: Section "Type Definitions"

## Target Files
- [x] `libs/telegraf/src/interfaces/dynamic-telegraf-options.interface.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No tests needed for interface-only file (L3 verification)
- [x] Red state maintained from Phase 0 (services don't exist yet)

### 2. Green Phase
- [x] Create new file `dynamic-telegraf-options.interface.ts`
- [x] Implement `DynamicBotConfig` interface:
  ```typescript
  interface DynamicBotConfig {
    id: number
    token: string
    name: string
    username: string | null
    webhookPath: string
    isActive: boolean
    settings?: BotSettings | null
  }
  ```
- [x] Implement `BotSettings` interface:
  ```typescript
  interface BotSettings {
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
  ```
- [x] Implement `BotConfigurationProvider` interface:
  ```typescript
  interface BotConfigurationProvider {
    loadDynamicBots(): Promise<DynamicBotConfig[]>
  }
  ```
- [x] Implement `TelegrafDynamicModuleOptions` interface
- [x] Implement `TelegrafDynamicModuleAsyncOptions` interface
- [x] Implement `DynamicBotInstance` interface
- [x] Implement `BotInitResult` interface
- [x] Implement `DynamicBotStats` interface
- [x] Export `BOT_CONFIGURATION_PROVIDER` injection token constant
- [x] Add JSDoc comments to all interfaces

### 3. Refactor Phase
- [x] Ensure consistent naming conventions
- [x] Verify all required imports from `@nestjs/common` and `telegraf`
- [x] Run build to verify no type errors

## Interface Definitions Summary

| Interface | Purpose |
|-----------|---------|
| `DynamicBotConfig` | Bot configuration from database |
| `BotSettings` | Feature flags and defaults per bot |
| `BotConfigurationProvider` | Abstract database access interface |
| `TelegrafDynamicModuleOptions` | Options for forRootDynamic() |
| `TelegrafDynamicModuleAsyncOptions` | Async options variant |
| `DynamicBotInstance` | Running bot instance with metadata |
| `BotInitResult` | Result of bot initialization attempt |
| `DynamicBotStats` | Initialization statistics |

## Completion Criteria
- [x] All 8 interfaces defined
- [x] `BOT_CONFIGURATION_PROVIDER` token exported
- [x] JSDoc comments on all public types
- [x] `npm run build` passes
- [x] File importable: `import { DynamicBotConfig } from './interfaces/dynamic-telegraf-options.interface'`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: New file only
- Constraints: Must match Design Doc type definitions exactly
- No `any` types allowed - full type safety required
- These interfaces will be used by DynamicTelegrafService and DynamicTelegrafCoreModule
