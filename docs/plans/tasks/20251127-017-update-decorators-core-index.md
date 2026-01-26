# Task: Update decorators/core/index.ts Exports

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Tasks 20251127-015, 20251127-016 (decorators created)
- Provides: Public API exports for new decorators
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Update the decorators/core barrel export file to include the new @ForBot and @RequiresFeature decorators for public API access.

Design Doc Reference: Section "Implementation Plan" - Decorator exports

## Target Files
- [x] `libs/telegraf/src/decorators/core/index.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No tests needed for export-only file (L3 verification)

### 2. Green Phase
- [x] Read existing `decorators/core/index.ts` file
- [x] Add exports for new decorators:
  ```typescript
  export { ForBot } from './for-bot.decorator'
  export { RequiresFeature } from './requires-feature.decorator'
  ```

### 3. Refactor Phase
- [x] Organize exports alphabetically or logically
- [x] Run build to verify exports resolve

## Completion Criteria
- [x] @ForBot exported from decorators/core/index.ts
- [x] @RequiresFeature exported from decorators/core/index.ts
- [x] Existing exports unchanged
- [x] `npm run build` passes
- [x] Decorators importable: `import { ForBot, RequiresFeature } from './decorators/core'`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: Additive change to existing barrel file
- Constraints: Do not modify or remove any existing exports
- These decorators will be available at package root via decorators index
