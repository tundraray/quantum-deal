# Task: Implement registerUpdates() Method

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-020 (registerHandlers)
- Provides: Registration of @Update decorated handlers on dynamic bots
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Implement the `registerUpdates()` method that filters @Update decorated classes, checks @ForBot targeting and @RequiresFeature flags, and registers listeners on the bot.

Design Doc Reference: Section "DynamicListenersExplorerService" - registerUpdates

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update tests for registerUpdates and shared handlers:
  ```typescript
  describe('Handler Discovery', () => {
    it('discovers all @Update decorated classes from shared handler modules', () => {
      // Arrange
      @Update()
      class TestUpdate {}

      setupModuleMock([TestUpdate])

      // Act
      service.registerHandlers(mockBot, 1, mockStage, null)

      // Assert
      const updates = service['filterUpdates'](mockWrapper)
      expect(updates).toBeDefined()
    })
  })

  describe('AC-4: Shared Handler Registration', () => {
    it('shared handler without @ForBot is registered on all dynamic bots', () => {
      @Update()
      class SharedHandler {
        @Start()
        onStart() { return 'hello' }
      }

      setupModuleMock([SharedHandler])

      // Register on bot 1
      service.registerHandlers(mockBot1, 1, mockStage1, null)
      // Register on bot 2
      service.registerHandlers(mockBot2, 2, mockStage2, null)

      expect(mockBot1.start).toHaveBeenCalled()
      expect(mockBot2.start).toHaveBeenCalled()
    })
  })

  describe('AC-4: Per-bot Handler Filtering (@ForBot)', () => {
    it('@ForBot(botId) handler only registered on target bot', () => {
      @Update()
      @ForBot(1)
      class Bot1OnlyHandler {
        @Start()
        onStart() {}
      }

      setupModuleMock([Bot1OnlyHandler])

      // Register on bot 1 - should work
      service.registerHandlers(mockBot1, 1, mockStage1, null)
      // Register on bot 2 - should skip
      service.registerHandlers(mockBot2, 2, mockStage2, null)

      expect(mockBot1.start).toHaveBeenCalled()
      expect(mockBot2.start).not.toHaveBeenCalled()
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `filterUpdates()`:
  ```typescript
  private filterUpdates(
    wrapper: InstanceWrapper
  ): InstanceWrapper<unknown> | undefined {
    const { instance } = wrapper
    if (!instance) return undefined

    const isUpdate = this.metadataAccessor.isUpdate(
      wrapper.metatype as Function
    )
    return isUpdate ? wrapper : undefined
  }
  ```
- [x] Implement `registerUpdates()`:
  ```typescript
  private registerUpdates(
    modules: Module[],
    bot: Telegraf<Context>,
    botId: number,
    settings: BotSettings | null
  ): void {
    const updates = this.flatMap<InstanceWrapper>(modules, (instance) =>
      this.filterUpdates(instance)
    )

    for (const wrapper of updates) {
      // Check for bot-specific handler targeting
      const targetBotId = this.metadataAccessor.getBotTargetMetadata(
        wrapper.metatype as Function
      )

      // Skip handler if it targets a different bot
      if (targetBotId !== undefined && targetBotId !== botId) {
        continue
      }

      // Check feature flags for conditional handlers
      if (!this.shouldRegisterHandler(wrapper, settings)) {
        continue
      }

      this.registerListeners(bot, wrapper)
    }
  }
  ```

### 3. Refactor Phase
- [x] Ensure proper type casting
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases (AC-4)

| Test | Description | Status |
|------|-------------|--------|
| "discovers all @Update decorated classes" | Update discovery | Pass |
| "shared handler without @ForBot registered on all bots" | Shared handler | Pass |
| "@ForBot(botId) handler only registered on target bot" | ForBot filtering | Pass |

## Completion Criteria
- [x] `filterUpdates()` identifies @Update decorated classes
- [x] `registerUpdates()` applies @ForBot filtering
- [x] `registerUpdates()` applies @RequiresFeature filtering
- [x] Calls `registerListeners()` for each passing handler
- [x] Related unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "Update"
npm run build
```

## Notes
- Impact scope: DynamicListenersExplorerService
- Constraints: Must check both @ForBot and @RequiresFeature metadata
- Uses flatMap from BaseExplorerService
