# Task: Implement registerScenes() Method

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-021 (registerUpdates)
- Provides: Registration of @Scene and @Wizard decorated classes on per-bot Stage
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-3 (Per-bot Stage Isolation), AC-4 (Handler Registration)

## Implementation Content
Implement the `registerScenes()` method that filters @Scene and @Wizard decorated classes, creates scene instances, and registers them on the per-bot Stage.

Design Doc Reference: Section "DynamicListenersExplorerService" - registerScenes

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update tests for scene registration:
  ```typescript
  describe('Handler Discovery', () => {
    it('discovers all @Scene decorated classes from shared handler modules', () => {
      @Scene('test-scene')
      class TestScene {}

      setupModuleMock([TestScene])

      const scenes = service['filterScenes'](mockWrapper)
      expect(scenes).toBeDefined()
    })

    it('discovers all @Wizard decorated classes from shared handler modules', () => {
      @Wizard('test-wizard')
      class TestWizard {}

      setupModuleMock([TestWizard])

      const scenes = service['filterScenes'](mockWrapper)
      expect(scenes).toBeDefined()
    })
  })

  describe('Scene Registration', () => {
    it('registers @Scene classes as BaseScene on per-bot Stage', () => {
      @Scene('greeting-scene')
      class GreetingScene {
        @SceneEnter()
        onEnter(@Ctx() ctx) {}
      }

      setupModuleMock([GreetingScene])

      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockStage.register).toHaveBeenCalled()
    })

    it('registers @Wizard classes as WizardScene with @WizardStep middlewares', () => {
      @Wizard('setup-wizard')
      class SetupWizard {
        @WizardStep(1)
        step1(@Ctx() ctx) {}

        @WizardStep(2)
        step2(@Ctx() ctx) {}
      }

      setupModuleMock([SetupWizard])

      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockStage.register).toHaveBeenCalled()
    })

    it('warns and skips duplicate scene IDs during registration', () => {
      @Scene('duplicate-scene')
      class Scene1 {}

      @Scene('duplicate-scene')
      class Scene2 {}

      setupModuleMock([Scene1, Scene2])

      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate scene ID')
      )
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `filterScenes()`:
  ```typescript
  private filterScenes(
    wrapper: InstanceWrapper
  ): InstanceWrapper<unknown> | undefined {
    const { instance } = wrapper
    if (!instance) return undefined

    const isScene = this.metadataAccessor.isScene(
      wrapper.metatype as Function
    )
    return isScene ? wrapper : undefined
  }
  ```
- [x] Implement `registerScenes()`:
  ```typescript
  private registerScenes(
    modules: Module[],
    stage: Scenes.Stage<Scenes.SceneContext>,
    botId: number
  ): void {
    const scenes = this.flatMap<InstanceWrapper>(modules, (wrapper) =>
      this.filterScenes(wrapper)
    )

    const sceneIds = new Set<string>()

    for (const wrapper of scenes) {
      const sceneMetadata = this.metadataAccessor.getSceneMetadata(
        wrapper.instance.constructor
      )

      if (!sceneMetadata) continue

      const { sceneId, type, options } = sceneMetadata

      // Prevent duplicate scene IDs
      if (sceneIds.has(sceneId)) {
        this.logger.warn(
          `Duplicate scene ID "${sceneId}" detected for bot ${botId}, skipping`
        )
        continue
      }
      sceneIds.add(sceneId)

      // Create scene based on type
      const scene =
        type === 'base'
          ? new Scenes.BaseScene<Scenes.SceneContext>(sceneId, options || {})
          : new Scenes.WizardScene<Scenes.WizardContext>(sceneId, options || {})

      // Register scene on stage
      stage.register(scene)

      // Register listeners on scene
      if (type === 'base') {
        this.registerListeners(scene, wrapper)
      } else {
        this.registerWizardListeners(
          scene as Scenes.WizardScene<Scenes.WizardContext>,
          wrapper
        )
      }
    }
  }
  ```

### 3. Refactor Phase
- [x] Ensure proper scene type handling
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases

| Test | Description | Status |
|------|-------------|--------|
| "discovers all @Scene decorated classes" | Scene discovery | Pass |
| "discovers all @Wizard decorated classes" | Wizard discovery | Pass |
| "registers @Scene as BaseScene on Stage" | BaseScene registration | Pass |
| "registers @Wizard as WizardScene with steps" | WizardScene registration | Pass |
| "warns and skips duplicate scene IDs" | Duplicate handling | Pass |

## Completion Criteria
- [x] `filterScenes()` identifies @Scene and @Wizard decorated classes
- [x] `registerScenes()` creates correct scene types
- [x] Scenes registered on per-bot Stage
- [x] Duplicate scene IDs logged and skipped
- [x] Related unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "Scene"
npm run build
```

## Notes
- Impact scope: DynamicListenersExplorerService
- Constraints: Scene IDs must be unique per bot
- This ensures AC-3 compliance (scenes isolated per bot)
