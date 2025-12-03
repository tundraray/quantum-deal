# Task: Implement Per-bot Stage Creation

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Task 20251127-008 (bot registry)
- Provides: Per-bot Scenes.Stage instance for scene isolation
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-3 (Per-bot Stage Isolation)

## Implementation Content
Implement per-bot Stage instance creation to ensure scene isolation between different dynamic bots. Each bot must have its own `Scenes.Stage<Scenes.SceneContext>` instance stored in `DynamicBotInstance`.

Design Doc Reference: Section "AC-3: Per-bot Stage Isolation"

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update AC-3 tests to real assertions:
  ```typescript
  describe('AC-3: Per-bot Stage Isolation', () => {
    it('creates separate Stage instance for each bot', async () => {
      await service.onModuleInit()

      const bot1Instance = service.getBotInstance(1)
      const bot2Instance = service.getBotInstance(2)

      expect(bot1Instance?.stage).toBeDefined()
      expect(bot2Instance?.stage).toBeDefined()
      expect(bot1Instance?.stage).not.toBe(bot2Instance?.stage)
    })

    it('registers scenes on per-bot Stage only', async () => {
      await service.onModuleInit()

      const bot1Instance = service.getBotInstance(1)
      const bot2Instance = service.getBotInstance(2)

      // Simulate scene registration on bot1's stage
      const testScene = new Scenes.BaseScene('test-scene')
      bot1Instance?.stage.register(testScene)

      // Verify bot2's stage doesn't have the scene
      expect(bot1Instance?.stage.scenes.get('test-scene')).toBeDefined()
      expect(bot2Instance?.stage.scenes.get('test-scene')).toBeUndefined()
    })
  })
  ```
- [x] Add `getBotInstance()` helper method for testing (returns full DynamicBotInstance)
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Add `getBotInstance()` method:
  ```typescript
  getBotInstance(botId: number): DynamicBotInstance | undefined {
    return this.bots.get(botId)
  }
  ```
- [x] Update `initializeBot()` to create per-bot Stage (already implemented in previous task):
  ```typescript
  private async initializeBot(config: DynamicBotConfig): Promise<BotInitResult> {
    const { id, name, token, webhookPath, settings } = config

    try {
      // Create Telegraf instance
      const bot = new Telegraf<Context>(token, this.options.telegrafOptions)

      // Create per-bot Stage instance (AC-3)
      const stage = new Scenes.Stage<Scenes.SceneContext>([])

      // Apply stage middleware to bot
      bot.use(stage.middleware())

      // Store bot instance with Stage
      const instance: DynamicBotInstance = {
        botId: id,
        name,
        bot,
        stage,
        webhookPath,
        settings: settings ?? null,
        username: 'pending', // Will be set after getMe()
      }

      this.bots.set(id, instance)
      this.webhookPathIndex.set(webhookPath, id)

      return { success: true, botId: id, name }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, botId: id, name, error: errorMessage }
    }
  }
  ```

### 3. Refactor Phase
- [x] Extract Stage creation to helper method if needed (not needed - inline creation is simple)
- [x] Ensure Stage middleware applied after global middlewares (verified in implementation)
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases (AC-3)

| Test | Description | Status |
|------|-------------|--------|
| "creates separate Stage instance for each bot" | Different object references | Pass |
| "registers scenes on per-bot Stage only" | Scene isolation | Pass |

## Completion Criteria
- [x] Each bot has its own `Scenes.Stage` instance
- [x] Stage stored in `DynamicBotInstance.stage`
- [x] Stage middleware applied to bot
- [x] `getBotInstance()` helper method added
- [x] AC-3 unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts --grep "AC-3"
npm run build
```

## Notes
- Impact scope: DynamicTelegrafService only
- Constraints: Stage middleware must be applied after global middlewares (ordering matters)
- This is critical for multi-bot isolation - scenes must not leak between bots
