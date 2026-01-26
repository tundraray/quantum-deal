# Task: Add Constants to telegraf.constants.ts

Metadata:
- Phase: 1 (Foundation)
- Dependencies: Task 20251127-003 (interfaces created)
- Provides: Injection tokens and metadata constants
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Add new injection tokens and metadata constants required by the Dynamic Telegraf module to the existing constants file.

Design Doc Reference: Section "Injection Tokens"

## Target Files
- [x] `libs/telegraf/src/telegraf.constants.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No tests needed for constants-only file (L3 verification)
- [x] Red state maintained from Phase 0

### 2. Green Phase
- [x] Read existing `telegraf.constants.ts` file
- [x] Add `DYNAMIC_TELEGRAF_SERVICE` token:
  ```typescript
  export const DYNAMIC_TELEGRAF_SERVICE = 'DYNAMIC_TELEGRAF_SERVICE'
  ```
- [x] Add `DYNAMIC_TELEGRAF_MODULE_OPTIONS` token:
  ```typescript
  export const DYNAMIC_TELEGRAF_MODULE_OPTIONS = 'DYNAMIC_TELEGRAF_MODULE_OPTIONS'
  ```
- [x] Add `BOT_TARGET_METADATA` constant:
  ```typescript
  export const BOT_TARGET_METADATA = 'BOT_TARGET_METADATA'
  ```
- [x] Add `FEATURE_FLAG_METADATA` constant:
  ```typescript
  export const FEATURE_FLAG_METADATA = 'FEATURE_FLAG_METADATA'
  ```
- [x] Add `DYNAMIC_WEBHOOK_PREFIX` constant:
  ```typescript
  export const DYNAMIC_WEBHOOK_PREFIX = '/dynamic'
  ```

### 3. Refactor Phase
- [x] Organize constants in logical groups with comments
- [x] Ensure consistent naming convention (SCREAMING_SNAKE_CASE)
- [x] Run build to verify no conflicts

## Constants to Add

| Constant | Value | Purpose |
|----------|-------|---------|
| `DYNAMIC_TELEGRAF_SERVICE` | `'DYNAMIC_TELEGRAF_SERVICE'` | DI token for DynamicTelegrafService |
| `DYNAMIC_TELEGRAF_MODULE_OPTIONS` | `'DYNAMIC_TELEGRAF_MODULE_OPTIONS'` | DI token for module options |
| `BOT_TARGET_METADATA` | `'BOT_TARGET_METADATA'` | Metadata key for @ForBot decorator |
| `FEATURE_FLAG_METADATA` | `'FEATURE_FLAG_METADATA'` | Metadata key for @RequiresFeature decorator |
| `DYNAMIC_WEBHOOK_PREFIX` | `'/dynamic'` | Default prefix for dynamic bot webhooks |

## Completion Criteria
- [x] All 5 constants added to file
- [x] Existing constants unchanged
- [x] `npm run build` passes
- [x] Constants importable: `import { DYNAMIC_TELEGRAF_MODULE_OPTIONS } from './telegraf.constants'`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: Additive changes only to existing file
- Constraints: Do not modify or remove any existing constants
- Constants must be exported for use by other modules
