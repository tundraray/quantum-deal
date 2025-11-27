# Task: Implement registerHandlers() Method

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-019 (skeleton created)
- Provides: Main entry point for registering handlers on dynamic bots
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Implement the `registerHandlers()` method that orchestrates handler, composer, and scene registration from shared handler modules onto a dynamic bot.

Design Doc Reference: Section "DynamicListenersExplorerService" - registerHandlers

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update test for registerHandlers:
  ```typescript
  describe('registerHandlers', () => {
    it('scans shared handler modules for registration', async () => {
      await service.registerHandlers(mockBot, 1, mockStage, mockSettings)

      expect(mockModulesContainer.get).toHaveBeenCalled()
    })

    it('calls registerUpdates with discovered modules', async () => {
      const registerUpdatesSpy = vi.spyOn(service as any, 'registerUpdates')

      await service.registerHandlers(mockBot, 1, mockStage, mockSettings)

      expect(registerUpdatesSpy).toHaveBeenCalled()
    })

    it('calls registerComposers with discovered modules', async () => {
      const registerComposersSpy = vi.spyOn(service as any, 'registerComposers')

      await service.registerHandlers(mockBot, 1, mockStage, mockSettings)

      expect(registerComposersSpy).toHaveBeenCalled()
    })

    it('calls registerScenes with discovered modules', async () => {
      const registerScenesSpy = vi.spyOn(service as any, 'registerScenes')

      await service.registerHandlers(mockBot, 1, mockStage, mockSettings)

      expect(registerScenesSpy).toHaveBeenCalled()
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `registerHandlers()`:
  ```typescript
  /**
   * Register handlers from shared handler modules on a dynamic bot
   *
   * @param bot - Telegraf instance to register handlers on
   * @param botId - Database bot ID for handler filtering
   * @param stage - Per-bot Stage instance for scene registration
   * @param settings - Bot settings for conditional handler registration
   */
  async registerHandlers(
    bot: Telegraf<Context>,
    botId: number,
    stage: Scenes.Stage<Scenes.SceneContext>,
    settings: BotSettings | null
  ): Promise<void> {
    const modules = this.getModules(
      this.modulesContainer,
      this.options.sharedHandlerModules
    )

    // Register @Update decorated classes (global handlers)
    this.registerUpdates(modules, bot, botId, settings)

    // Register @Composer decorated classes (stage middlewares)
    this.registerComposers(modules, stage)

    // Register @Scene and @Wizard decorated classes
    this.registerScenes(modules, stage, botId)

    this.logger.debug(`Handlers registered for bot ID ${botId}`)
  }
  ```
- [x] Update DynamicTelegrafService to inject and use DynamicListenersExplorerService

### 3. Refactor Phase
- [x] Ensure proper error handling
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases

| Test | Description | Status |
|------|-------------|--------|
| "scans shared handler modules for registration" | Module scanning | Pass |
| "calls registerUpdates with discovered modules" | Update registration | Pass |
| "calls registerComposers with discovered modules" | Composer registration | Pass |
| "calls registerScenes with discovered modules" | Scene registration | Pass |

## Completion Criteria
- [x] `registerHandlers()` orchestrates all registration types
- [x] Uses `getModules()` from BaseExplorerService
- [x] Calls `registerUpdates()`, `registerComposers()`, `registerScenes()`
- [x] Logs completion for debugging
- [x] Related unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "registerHandlers"
npm run build
```

## Notes
- Impact scope: DynamicListenersExplorerService
- Constraints: Must use BaseExplorerService.getModules() for module scanning
- This is the main entry point called by DynamicTelegrafService.initializeBot()
