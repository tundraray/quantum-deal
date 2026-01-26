# Task: Create @ForBot Decorator

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Phase 2 completion
- Provides: Decorator for targeting handlers to specific bots
- Size: Small (1 file)
- Verification Level: L3 (Build Success)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Create the `@ForBot(botId)` decorator that allows handlers to be registered only on specific dynamic bots by setting metadata that DynamicListenersExplorerService will read.

Design Doc Reference: Section "New Decorators" - @ForBot

## Target Files
- [x] `libs/telegraf/src/decorators/core/for-bot.decorator.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Tests for decorator will be in DynamicListenersExplorerService tests
- [x] Decorator itself is simple metadata setter (L3 verification)

### 2. Green Phase
- [x] Create new file `for-bot.decorator.ts`:
  ```typescript
  import { SetMetadata } from '@nestjs/common'
  import { BOT_TARGET_METADATA } from '../../telegraf.constants'

  /**
   * Decorator to target a handler to a specific dynamic bot
   *
   * When applied to an @Update class, the handler will only be
   * registered on the bot with the matching database ID.
   *
   * @param botId - Database ID of the target bot
   *
   * @example
   * ```typescript
   * @Update()
   * @ForBot(5) // Only registered on bot with ID 5
   * export class BrandSpecificUpdate {
   *   @Start()
   *   async onStart(@Ctx() ctx) {
   *     await ctx.reply('Welcome to Brand 5!')
   *   }
   * }
   * ```
   */
  export const ForBot = (botId: number) =>
    SetMetadata(BOT_TARGET_METADATA, botId)
  ```

### 3. Refactor Phase
- [x] Ensure JSDoc documentation is comprehensive
- [x] Run build to verify compilation

## Completion Criteria
- [x] `@ForBot` decorator created
- [x] Uses `BOT_TARGET_METADATA` constant from telegraf.constants.ts
- [x] JSDoc with usage example
- [x] `npm run build` passes
- [x] Decorator importable from `./decorators/core/for-bot.decorator`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: New file only
- Constraints: Must use SetMetadata from @nestjs/common
- The decorator is consumed by MetadataAccessorService.getBotTargetMetadata()
