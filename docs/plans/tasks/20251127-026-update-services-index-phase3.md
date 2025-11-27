# Task: Update services/index.ts Exports (Phase 3)

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-025 (registerListeners)
- Provides: Public API export for DynamicListenersExplorerService
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Update the services barrel export file to include DynamicListenersExplorerService for public API access.

Design Doc Reference: Section "Implementation Plan" - Service exports

## Target Files
- [x] `libs/telegraf/src/services/index.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No tests needed for export-only file (L3 verification)

### 2. Green Phase
- [x] Read existing `services/index.ts` file
- [x] Add export for DynamicListenersExplorerService:
  ```typescript
  export { DynamicListenersExplorerService } from './dynamic-listeners-explorer.service'
  ```
  Note: Export already exists using wildcard pattern: `export * from './dynamic-listeners-explorer.service';`

### 3. Refactor Phase
- [x] Organize exports in logical order
- [x] Run build to verify exports resolve

## Completion Criteria
- [x] DynamicListenersExplorerService exported from services/index.ts
- [x] Existing exports unchanged
- [x] `npm run build` passes
- [x] Service importable: `import { DynamicListenersExplorerService } from './services'`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: Additive change to existing barrel file
- Constraints: Do not modify or remove any existing exports
- Both DynamicTelegrafService and DynamicListenersExplorerService now exported
