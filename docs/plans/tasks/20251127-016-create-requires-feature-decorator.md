# Task: Create @RequiresFeature Decorator

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-015 (@ForBot decorator)
- Provides: Decorator for conditional handler registration based on feature flags
- Size: Small (1 file)
- Verification Level: L3 (Build Success)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Create the `@RequiresFeature(featureKey)` decorator that allows handlers to be conditionally registered based on bot settings feature flags.

Design Doc Reference: Section "New Decorators" - @RequiresFeature

## Target Files
- [x] `libs/telegraf/src/decorators/core/requires-feature.decorator.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Tests for decorator will be in DynamicListenersExplorerService tests
- [x] Decorator itself is simple metadata setter (L3 verification)

### 2. Green Phase
- [x] Create new file `requires-feature.decorator.ts`:
  ```typescript
  import { SetMetadata } from '@nestjs/common'
  import { FEATURE_FLAG_METADATA } from '../../telegraf.constants'

  /**
   * Decorator to conditionally register handler based on bot feature flag
   *
   * When applied to an @Update class, the handler will only be registered
   * on bots where the specified feature is enabled in BotSettings.features.
   *
   * @param featureKey - Key from BotSettings.features (e.g., 'paymentsEnabled')
   *
   * @example
   * ```typescript
   * @Update()
   * @RequiresFeature('paymentsEnabled')
   * export class PaymentUpdate {
   *   @Command('pay')
   *   async onPay(@Ctx() ctx) {
   *     // Only executes on bots with paymentsEnabled: true
   *     await ctx.reply('Payment menu...')
   *   }
   * }
   * ```
   *
   * @example Multiple features (use both decorators)
   * ```typescript
   * @Update()
   * @RequiresFeature('paymentsEnabled')
   * @RequiresFeature('trialEnabled') // Both must be true
   * export class TrialPaymentUpdate { ... }
   * ```
   */
  export const RequiresFeature = (featureKey: string) =>
    SetMetadata(FEATURE_FLAG_METADATA, featureKey)
  ```

### 3. Refactor Phase
- [x] Ensure JSDoc documentation is comprehensive
- [x] Run build to verify compilation

## Completion Criteria
- [x] `@RequiresFeature` decorator created
- [x] Uses `FEATURE_FLAG_METADATA` constant from telegraf.constants.ts
- [x] JSDoc with usage examples
- [x] `npm run build` passes
- [x] Decorator importable from `./decorators/core/requires-feature.decorator`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: New file only
- Constraints: Must use SetMetadata from @nestjs/common
- The decorator is consumed by MetadataAccessorService.getFeatureFlagMetadata()
- Feature keys must match BotSettings.features property names
