# Task: Extend MetadataAccessorService

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-017 (decorators exported)
- Provides: Metadata accessor methods for @ForBot and @RequiresFeature
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Add two new methods to MetadataAccessorService for extracting metadata set by @ForBot and @RequiresFeature decorators.

Design Doc Reference: Section "MetadataAccessorService Extensions"

## Target Files
- [x] `libs/telegraf/src/services/metadata-accessor.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/metadata-accessor.service.spec.ts` (new dedicated test file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create metadata accessor tests in metadata-accessor.service.spec.ts:
  ```typescript
  describe('Bot Target Filtering (@ForBot)', () => {
    it('extracts bot target ID from @ForBot decorator metadata', () => {
      @ForBot(5)
      class TargetedHandler {}

      const botId = metadataAccessor.getBotTargetMetadata(TargetedHandler)

      expect(botId).toBe(5)
    })

    it('returns undefined when no @ForBot decorator', () => {
      class SharedHandler {}

      const botId = metadataAccessor.getBotTargetMetadata(SharedHandler)

      expect(botId).toBeUndefined()
    })
  })

  describe('Feature Flag Filtering (@RequiresFeature)', () => {
    it('extracts feature key from @RequiresFeature decorator metadata', () => {
      @RequiresFeature('paymentsEnabled')
      class FeatureHandler {}

      const featureKey = metadataAccessor.getFeatureFlagMetadata(FeatureHandler)

      expect(featureKey).toBe('paymentsEnabled')
    })

    it('returns undefined when no @RequiresFeature decorator', () => {
      class AlwaysHandler {}

      const featureKey = metadataAccessor.getFeatureFlagMetadata(AlwaysHandler)

      expect(featureKey).toBeUndefined()
    })
  })
  ```
- [x] Run tests - confirm failures (8 tests failed as expected)

### 2. Green Phase
- [x] Add imports to metadata-accessor.service.ts:
  ```typescript
  import {
    BOT_TARGET_METADATA,
    FEATURE_FLAG_METADATA,
  } from '../telegraf.constants'
  ```
- [x] Add `getBotTargetMetadata()` method:
  ```typescript
  /**
   * Get bot target metadata (for per-bot handler filtering)
   * Returns undefined if handler should apply to all bots
   */
  getBotTargetMetadata(target: Function): number | undefined {
    if (!target) return undefined
    return this.reflector.get(BOT_TARGET_METADATA, target)
  }
  ```
- [x] Add `getFeatureFlagMetadata()` method:
  ```typescript
  /**
   * Get feature flag metadata (for conditional handler registration)
   * Returns undefined if handler has no feature flag requirement
   */
  getFeatureFlagMetadata(target: Function): string | undefined {
    if (!target) return undefined
    return this.reflector.get(FEATURE_FLAG_METADATA, target)
  }
  ```

### 3. Refactor Phase
- [x] Ensure consistent error handling for null/undefined targets
- [x] Run tests - confirm passing (8/8 tests pass)
- [x] Run build to verify compilation (webpack compiled successfully)

## Test Cases

| Test | Description | Status |
|------|-------------|--------|
| "extracts bot target ID from @ForBot" | ForBot metadata | Pass |
| "returns undefined when no @ForBot" | Missing ForBot | Pass |
| "extracts feature key from @RequiresFeature" | RequiresFeature metadata | Pass |
| "returns undefined when no @RequiresFeature" | Missing RequiresFeature | Pass |

## Completion Criteria
- [x] `getBotTargetMetadata()` extracts @ForBot metadata
- [x] `getFeatureFlagMetadata()` extracts @RequiresFeature metadata
- [x] Both methods handle null/undefined targets
- [x] Related unit tests pass (8/8 tests)
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "metadata"
npm run build
```

## Notes
- Impact scope: MetadataAccessorService only
- Constraints: Methods must return undefined (not null) when metadata missing
- These methods are consumed by DynamicListenersExplorerService
